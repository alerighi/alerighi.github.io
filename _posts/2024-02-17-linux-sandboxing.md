---
layout: default
title: "Linux sandboxing with namespaces"
title_left: SANDBOX
fn_keys:
  - key: F3
    text: Exit
    href: "/blog"
  - key: F11
    text: RSS
    href: "/feed.xml"
  - key: F12
    text: Print
    href: "#"
    onclick: "window.print(); return false"
description: A practical guide on sandboxing processing in Linux using the namespaces functionality
---

# Linux sandboxing with namespaces

In this series of articles I will write how I've made [tabox](https://github.com/alerighi/tabox), a 
program that sandboxes an executable in Linux. To do so, we will recreate a similar program in C, 
starting from scratch. 

The goal is to write a program that is able to spawn other programs inside an isolated environment. 
The sandboxing program will run with standard user privileges (_rootless_), unlike other implementations.

You will learn the technologies at the basis of Linux containerization, such as Docker, LXC, and the
sandboxes used by applications such as web browsers.

## Linux namespaces

Let's first talk about the technology at the basis. Linux separates groups of resources in namespaces. 

Examples of namespaces are:
- net namespace
- mount namespace
- user namespace
- pid namespace 
- and many more... see: [`namespace(7)`](https://man7.org/linux/man-pages/man7/namespaces.7.html)

It's possible to [`unshare(2)`](https://man7.org/linux/man-pages/man2/unshare.2.html) a namespace; 
the operation connects the process to a new namespace. 

It's important to know that child processes by default inherits the namespaces of the parent, unless
otherwise specified in the [`clone(2)`](https://man7.org/linux/man-pages/man2/clone.2.html) system call.

If, for example, I unshare the `net` namespace, the process that makes the call, and all the newly created
child processes, will view a separate network stack, with it's own network interfaces. Of course
a network interface can be connected to the namespace: it's what containerization software, like Docker, does.

The user namespace, is kind of a special namespace. It will allow to have a separate view of users,
that is UID/GID, inside the namespace. This allows, for example, to figure out as a root user (UID 0) inside
the namespace itself. Of course, this won't give you root privileges on the machine!

But it can, under certain conditions, allow some system calls that are normally restricted to root. 
One example, that we will use later, is [chroot](https://man7.org/linux/man-pages/man2/chroot.2.html).

## Implementation

Enough theory. Let's start writing some code! 

First at all, we will need to start a process inside the new namespace. To do so, we will use the 
[`clone(2)`](https://man7.org/linux/man-pages/man2/clone.2.html) system call. Then our main process
can just wait for the child to terminate (or terminate immediately, and let the child run as a daemon).

Then, in the newly created process, we will do some setup required. We will first map UID and GID to 
make sure we are actually root inside the namespace. Then, we will mount a tmpfs (remember: no root 
required here!) and setup owr virtual `/` filesystem. Finally, we chroot into this filesystem.

Finally we are inside the namespace filesystem. We could start running code here: however there is still
one small issue. Since we did also unshare the PID namespace, the PID of the process running inside
the namespace is 1. This is kind of a special PID, for a number of reasons (that I don't even exactly
understand) and this can lead to strange behaviors.

We will thus just need to fork another time to start our real process inside the namespace. For convenience, 
I will start a `busybox` binary, such that we have a shell inside the namespace to explore it.

Conveniently busybox distributes precompiled statically linked binaries directly on their [website](https://busybox.net/downloads/binaries/)!

## Entering the box environment

As previously said, we enter the box environment with the `clone` system call. 
I will use `clone3`, a more convenient version of the clone syscall. Unfortunately 
that is, at the moment, not wrapped by glibc, so we will need to call it directly:

```c
struct clone_args args = {
    .flags = CLONE_NEWUSER 
        | CLONE_NEWCGROUP
        | CLONE_NEWIPC 
        | CLONE_NEWNET 
        | CLONE_NEWNS
        | CLONE_NEWPID
        | CLONE_NEWUTS,
    .exit_signal = SIGCHLD,
};

long pid = syscall(SYS_clone3, &args, sizeof(args));
if (pid < 0) { 
    /* handle error */ 
} else if (pid == 0) { 
    /* child process, inside the namespace */
    sandbox_main(); 
} else { 
    /* parent process: wait child */
    int status;
    waitpid(pid, &status, 0);
    /* do something with return status of child */
}

```

## Setting up the sandbox

As previously said, we need to do some operations to setup the sandboxed environment. 
First, we setup mapping of UID/GID with the one outside the sandbox.

```c
/* deny setgroups system call (don't remember why this is important) */
write_file("/proc/self/setgroups", 0666, "deny");

/* write UID mapping, mapping uid 0 to parent uid. Parent UID can be read in main() with getuid() */
write_file("/proc/self/uid_map", 0666, "0 %d 1", parent_uid);
    
/* write GID mapping, mapping uid 0 to parent gid. Parent GID can be read in main() with getgid() */
write_file("/proc/self/gid_map", 0666, "0 %d 1", parent_gid);

/* now we are root! */
assert(getuid() == 0); assert(getgid() == 0);

/* create tempdir */
char tempdir_template[] = "/tmp/minibox_XXXXXX";
char *tempdir = mkdtemp(tempdir_template);

/* we need now to setup a virtual filesystem for the sandbox. 
* First we mount the root directory as a tmpfs */
mount("tmpfs", tempdir, "tmpfs", 0, "mode=0755,size=1G"));

/* create basic fs structure just to get busybox running */
create_dir(tempdir, "/proc");
create_dir(tempdir, "/bin");
create_dir(tempdir, "/real_root");

/* place busybox executable in /bin, plus init script.
 * place addictional files in the box here, if you need them */
copy_file(tempdir, "/bin/busybox", 0744, "busybox");
copy_file(tempdir, "/init", 0744, "init");

/* mount real root for easy of accessing files. Dangerous! */
mount_bind(tempdir, "/real_root", "/");

/* now chroot into the newly create filesystem */
chroot(tempdir);
chdir("/");

/* mount proc, may be needed by tools like ps */
mount("/proc", "/proc", "proc", 0, NULL);
```

Finally, we are ready to fork and run our init process:

```c
pid_t child_pid = fork();
if (child_pid == 0) {
    char *argv[] = {NULL};
    char *envp[] = {"HOME=/root", "USER=root", "PATH=/bin:/sbin:/usr/bin:/usr/sbin", NULL};
        
    execve("/init", argv, envp);
}

/* parent, since it's PID 1, needs to constantly wait for childrens,
 * to avoid creation of zoombie processes! */
while (1) {
    int status;
    pid_t pid = CHECK_ERR(wait(&status));

    if (WIFEXITED(status)) {
        fprintf(stderr, "process %d has exited with status %d", pid, WEXITSTATUS(status));
    }
    if (WIFSIGNALED(status)) {
        fprintf(stderr, "process %d exited with signal %d", pid, WSTOPSIG(status));
    }
}
```

The `/init` file that I copied in the box is a simple script that does some sort
of setup before running a shell, such as creating the files that are expected for 
programs to run correctly:

```bash
#!/bin/busybox sh

set -xe 

: creating basic fs structure
busybox mkdir -p /sbin /lib /usr/bin /usr/lib /usr/include /usr/share /usr/src /usr/sbin \
    /usr/local/bin /usr/local/lib /usr/local/etc /usr/local/share /usr/local/include \
    /etc /tmp /run /var/log /var/cache /var/spool /opt $HOME

: installing busybox
busybox --install -s

: creating required files
echo "root:x:0:0::/root:/bin/bash" > /etc/passwd
echo "root:x:0:root" > /etc/group
echo "127.0.0.1 localhost localhost.localdomain" > /etc/hosts

: activating lo network interface
ip link set dev lo up

: setting hostname
hostname minibox

: changing current directory
cd $HOME

: starting shell
exec sh --login
```

Let's try it out: 
```
 $ ./minibox
[box] pid = 141163, uid = 1000, gid = 1000
[box] child started, pid = 141164
[init] child started
[init] setting up uid/gid mapping
[init] creating sandbox temporary directory
[init] mounting root directory to /tmp/minibox_FpIJWJ
[init] running /init
+ : creating basic fs structure
+ busybox mkdir -p /sbin /lib /usr/bin /usr/lib /usr/include /usr/share /usr/src /usr/sbin /usr/local/bin /usr/local/lib /usr/local/etc /usr/local/share '/usr/local/include}' /etc /tmp /run /var/log /var/cache /var/spool /opt /root
+ : installing busybox
+ busybox --install -s
+ : creating required files
+ echo root:x:0:0::/root:/bin/bash
+ echo root:x:0:root
+ echo '127.0.0.1 localhost localhost.localdomain'
+ : activating lo network interface
+ ip link set dev lo up
+ : setting hostname
+ hostname minibox
+ : changing current directory
+ cd /root
+ : starting shell
+ exec sh --login
~ # ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
~ # ps -a
PID   USER     TIME  COMMAND
    1 root      0:00 {init} ./minibox
    2 root      0:00 sh --login
    8 root      0:00 ps -a
~ # 
```

And finally we are there. We made our Linux sandbox! 

If you are curios, you can find the whole source code, commented and with
error handling, [here](https://gist.github.com/alerighi/de0497edb3bdc3ad235b7cbfbbb7676d).
---
layout: default
title: "ArchLinux install with encrypted BTRFS"
title_left: ARCHINST
fn_keys:
  - key: F1
    text: Print
    href: "#"
    onclick: "window.print(); return false"
  - key: F3
    text: Exit
    href: "/blog"
og_description: Practical guide on how to install ArchLinux on BTRFS with encrypted FS
---

In this article I will show you how to install ArchLinux on a BTRFS drive with an encrypted fs. 

## Prerequisites

Download and copy on an USB drive the latest install ISO of ArchLinux. 

If you are installing it in dual boot with Windows, it's recommended that you resize its partition from within Windows itself, to avoid data corruption. To do so search for "Create and format partitions" on the Windows search bar, open "Disk Management", select the Windows C partition and resize it to the desired size, to create a free space to install Linux. 

Boot the computer from the USB drive, ensuring to select EFI boot mode (the GRUB menu should be visible). You should be at a shell prompt logged in as root. The network should be already configured if an ethernet cable is attached. Try to ping an host to confirm that internet is reachable (it will be needed later).

## Setup partitions

Now we need to create the required partitions. For this setup we will create three partitions:

| # | filesystem | size | description    |
|---|------------|------|----------------|
| 1 | FAT32      | 500M | EFI partition  |
| 2 | luks       | 100% | root partition |

_NOTE_: when dual booting with Windows you only need to create the / partition, not a new label or the EFI partition!

To do so, we can use the `fdisk` command (but feel free to use any other program, such as `cgdisk` or `gparted`).

```
root@archiso ~ # fdisk /dev/sda

Welcome to fdisk (util-linux 2.39.2).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.


Command (m for help): g
Created a new GPT disklabel (GUID: C2D253F4-B9C7-4F11-8DF8-18BE2D671531).

Command (m for help): n
Partition number (1-128, default 1):
First sector (2048-67108830, default 2048):
Last sector, +/-sectors or +/-size{K,M,G,T,P} (2048-67108830, default 67106815): +500M

Created a new partition 1 of type 'Linux filesystem' and of size 500 MiB.

Command (m for help): t
Selected partition 1
Partition type or alias (type L to list all): 1
Changed type of partition 'Linux filesystem' to 'EFI System'.

Command (m for help): n
Partition number (2-128, default 2):
First sector (1026048-67108830, default 1026048):
Last sector, +/-sectors or +/-size{K,M,G,T,P} (1026048-67108830, default 67106815):

Created a new partition 2 of type 'Linux filesystem' and of size 31.5 GiB.

Command (m for help): p
Disk /dev/sda: 32 GiB, 34359738368 bytes, 67108864 sectors
Disk model: QEMU HARDDISK
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: gpt
Disk identifier: C2D253F4-B9C7-4F11-8DF8-18BE2D671531

Device       Start      End  Sectors  Size Type
/dev/sda1     2048  1026047  1024000  500M EFI System
/dev/sda2  1026048 67106815 66080768 31.5G Linux filesystem

Command (m for help): w
The partition table has been altered.
Calling ioctl() to re-read partition table.
Syncing disks.
```

Now we need to format the EFI partition (skip this step in case of a dual boot):

```
root@archiso ~ # mkfs.vfat /dev/sda1
```

Finally, we need to create the LUKS volume:

```
root@archiso ~ # cryptsetup luksFormat /dev/sda2

WARNING!
========
This will overwrite data on /dev/sda2 irrevocably.

Are you sure? (Type 'yes' in capital letters): YES
Enter passphrase for /dev/sda2:
Verify passphrase:
cryptsetup luksFormat /dev/sda2  30.31s user 3.80s system 137% cpu 24.815 total
```

_WARNING_: write down your passphrase somewhere safe! If you loose it, all your data will be irrecoverable.

Now that we created the LUKS volume, we need to open up. When opening an encrypted volume a new block device will be created using the Linux device mapper functionality. We then can treat this device as any other physical partition, and thus create on it a filesystem. Encryption is done transparently by the kernel at a block level. 

```
root@archiso ~ # cryptsetup luksOpen /dev/sda2 root
Enter passphrase for /dev/sda2:
cryptsetup luksOpen /dev/sda2 root  8.13s user 2.21s system 155% cpu 6.662 total
```

_NOTE_: root is just a name that we can choose to identify the device. We can give it whatever name we want!

Finally, we create our BTRFS filesystem, as we would do on a normal partition:

```
root@archiso ~ # mkfs.btrfs /dev/mapper/root
btrfs-progs v6.3.3
[...]
Devices:
   ID        SIZE  PATH
    1    31.49GiB  /dev/mapper/root
```

Now, we mount it and create subvols:

```
root@archiso ~ # mount /dev/mapper/root /mnt
root@archiso ~ # btrfs subvolume create /mnt/@
Create subvolume '/mnt/@'
root@archiso ~ # btrfs subvolume create /mnt/@home
Create subvolume '/mnt/@home'
root@archiso ~ # btrfs subvolume list /mnt
ID 256 gen 7 top level 5 path @
ID 257 gen 8 top level 5 path @home
root@archiso ~ # btrfs subvolume set-default 256 /mnt
root@archiso ~ # umount /mnt
```

_NOTE_: the `set-default` command sets the *default* subvolume. This is the subvol that is mounted if a different subvol is not specified. This is important, as we will see later, and will avoid us setting another kernel parameter just to tell on which subvol / resides!

We then mount all the filesystems:
```
root@archiso ~ # mount /dev/mapper/root /mnt
root@archiso ~ # ls /mnt # NOTE: it's empty! This is because we are indeed in the @ subvol
root@archiso ~ # mkdir /mnt/{home,boot}
root@archiso ~ # mount /dev/mapper/root -o subvol=@home /mnt/home
root@archiso ~ # mount /dev/sda1 /mnt/boot
root@archiso ~ # mount
[...]
/dev/mapper/root on /mnt type btrfs (rw,relatime,space_cache=v2,subvolid=256,subvol=/@)
/dev/mapper/root on /mnt/home type btrfs (rw,relatime,space_cache=v2,subvolid=257,subvol=/@home)
/dev/sda1 on /mnt/boot type vfat (rw,relatime,fmask=0022,dmask=0022,codepage=437,iocharset=ascii,shortname=mixed,utf8,errors=remount-ro)
```

We are now ready to install, as usual:

```
root@archiso ~ # pacstrap /mnt base base-devel linux vim
[...]
root@archiso ~ # genfstab -p /mnt >> /mnt/etc/fstab
root@archiso ~ # arch-chroot /mnt
[root@archiso /]#
```

We are now into the new installed system. Now we need to to a couple of configurations, start with the usual ones:

```
[root@archiso /]# passwd # I always forget this step... so better do it first!
New password:
Retype new password:
passwd: password updated successfully
[root@archiso /]# vim /etc/locale.gen # uncomment the locales you want to generate
[root@archiso /]# locale-gen
Generating locales...
  en_US.UTF-8...
[root@archiso /]# echo LANG=en_US.UTF-8 >> /etc/locale.conf # or whatever locale you choose
[roeot@archiso /]# ln -s /usr/share/zoneinfo/Europe/Rome /etc/localtime # change with your timezone
[root@archiso /]# echo archbook > /etc/hostname # choose your hostname
[root@archiso /]# vim /etc/hosts # and don't forget the hosts file
# add a line like so: 
# 127.0.0.1 localhost 
# 127.0.0.1 archbook archbook.domain
```

It's now a good time to install all the other software that may be required after the reboot (such as software to get the computer online, especially if using Wi-Fi). I will not install nothing since I prefer to it so later on. 

Now, we need to make some changes to the initrd to include the required modules:

```
[root@archiso /]# vim /etc/mkinitcpio.conf
# add `encrypt` to the HOOKS line before `filesystems`, as here:
# HOOKS=(base udev autodetect modconf kms keyboard keymap consolefont block encrypt filesystems fsck)
[root@archiso /]# mkinitcpio -p linux # rebuild initrd
```

Finally, install the bootloader. For simplicity I like `systemd-boot`:

```
[root@archiso /]# bootctl install
Created "/boot/EFI".
Created "/boot/EFI/systemd".
Created "/boot/EFI/BOOT".
Created "/boot/loader".
Created "/boot/loader/entries".
Created "/boot/EFI/Linux".
Copied "/usr/lib/systemd/boot/efi/systemd-bootx64.efi" to "/boot/EFI/systemd/systemd-bootx64.efi".
Copied "/usr/lib/systemd/boot/efi/systemd-bootx64.efi" to "/boot/EFI/BOOT/BOOTX64.EFI".
⚠️ Mount point '/boot' which backs the random seed file is world accessible, which is a security hole! ⚠️
⚠️ Random seed file '/boot/loader/.#bootctlrandom-seedbec08f14bf68c581' is world accessible, which is a security hole! ⚠️
Random seed file /boot/loader/random-seed successfully written (32 bytes).
Successfully initialized system token in EFI variable with 32 bytes.
Created EFI boot entry "Linux Boot Manager".
```

We finally have only to write the configuration file for the bootloader.

Create the entry file `/boot/loader/entries/arch.conf` with this content:
```
title   Arch Linux
linux   /vmlinuz-linux
initrd  /initramfs-linux.img
options root=/dev/mapper/root rw cryptdevice=/dev/disk/by-uuid/4e3342c8-03a8-43e3-87c1-283e5812dde4:root:allow-discards
```

_NOTE_: It's recommended to use UUIDs for the disk, since the names such as `sda1` may change when you add/remove disks from your system. To know the UUID of your partition, use the command `blkid /dev/sdYX`.

Finally, edit the loader file `/boot/loader/loader.conf` specifying the default entry:

```
timeout 3
console-mode keep
default arch.conf
```

_NOTE_: for additional security you may want to disable the editing of the kernel command line, that can be used to get a root shell (tough the root disk is still encrypted an attacker may install malware in the /boot partition!). To do so add the option `editor no` to the `loader.conf` file.

Now, we just have to reboot the machine and hope everything is fine!

```
[root@archiso /]# exit
exit
arch-chroot /mnt  45.02s user 40.38s system 6% cpu 21:18.02 total
130 root@archiso ~ # reboot
```

Congratulations! The system should now boot, ask you for a passphrase, and then bring you to the login prompt. From now on you can follow the standard ArchLinux post installation guide. 

If you want to improve or comment this guide, please do so on [GitHub](https://github.com/alerighi/alerighi.github.io)!

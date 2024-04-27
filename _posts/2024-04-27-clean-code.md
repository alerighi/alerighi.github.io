---
layout: default
title: Clean Code
title_left: BLOG
fn_keys:
  - key: F3
    text: Exit
    href: "/blog"
  - key: F12
    text: Print
    href: "#"
    onclick: "window.print(); return false"
og_description:
---

# Clean code

What is clean code? Someone will give you complex definitions, cite the SOLID principles (probably without even knowing what each letter means), dependency injection, inversion of control, and stuff.

All things that have their importance, sure. But, to me a clean code is something that can't be explained in books. I will give a simple definition: clean code is code that is pleasant to watch at.

You see, you may not be an electrician, but if you open an electrical panel you surely can distinguish a good job from a mess: everything is tidy, cables are of the correct color (you may not know what the correct color are, buy you see coherence, i.e. a black wire is not jointed with a blue one), and for excellent job, everything is labeled. If it is a mess, you will recognize it, even if you are not an expert.

To me code follows the same rules. Writing code is a creative process, the result of this process can look nice or ugly. Here is an example that I've made up from code that I've seen in my day job:

```c
ErrorCode WiFi_Connect(WiFiNetwork * network)
{
    ErrorCode error = SUCCESS;

    wifi_network_t * net = (wifi_network_t *)calloc(1, sizeof(wifi_network_t));
    if (net==NULL)
    {
        error = FAILURE;
    }
    else
    {
        // initialize wifi interface
        error = wifi_init_interface();
        if (error != SUCCESS)
        {
            LOG_ERROR("error while initializing the Wi-Fi interface, check the state of the MCU");
        }
        else
        {
            (void)snprintf(net.ssid, sizeof(net.ssid), "%s", network->ssid);

            // set the configuration
            error = wifi_set_config(&net);
            if (error != SUCCESS) {
                  LOG_ERROR("error setting up Wi-Fi configuration, the error code is %d", error);
            }
        }
    }

    if (net != NULL)
        free(net);

    return error;
}
```

Do you think this code is tidy? I don't think so. By reading it, I see a lot of noise, and can't
get straight to the point of what this code does.

What is noise? Noise is statements that state the obvious. Statements that don't do anything useful,
but waste characters. They waste characters for the person who types them, for who reads them, and
for the compiler that has to do more work compiling the code, and use more storage on disk.

Let's remove the things that are useless:

- comments that state the obvious. Code must be easy to read, comments shall only be added to document things that are not obvious from the code (better: refactor the code to eliminate the need of the comment)
- spacing and consistency in indentation is important! Even if the compiler doesn't care about
- in C, unlike C++, there is absolutely no need to cast out a `void *` to another pointer type. It just doesn't make any difference to do so, so we may as well eliminate the cast
- if a `NULL` argument is passed to the `free()` function, the call will succeed. So there is absolutely no reason to test the argument passed to free for `NULL`
- casting a return value of a function to `(void)` may make some linters happy. I would rather configure the linter with more sane rules, since checking **every** return value just adds a ton of noise
- log messages waste resources, and code space. Try to be short and get right to the point, while providing enough information to debug the issue

Now, these are trivial things, that overall make code readability better. Let's drive further into it: error handling.

Don't you think that all that error checking logic clutters the code? I think so. I don't advocate to not controlling errors, return codes must always be checked. What I'm saying is that we could do that in a better way.

How? Well, probably advocates of clean code, or better person that believe to know what it is, will strongly disagree to what I'm saying. We could use a construct of C, the `goto` statement. Yes, the one that Dijkstra hated. But: we will use it in a

Let's see the difference:

```c
ErrorCode WiFi_Connect(WiFiNetwork *network)
{
    wifi_network_t *net = calloc(1, sizeof(wifi_network_t));
    if (net == NULL)
    {
        return FAILURE;
    }

    ErrorCode error = wifi_init_interface();
    if (error != SUCCESS)
    {
        LOG_ERROR("wifi_init_interface err %d", error);
        goto error;
    }

    snprintf(net.ssid, sizeof(net.ssid), "%s", network->ssid);

    error = wifi_set_config(&net);
    if (error != SUCCESS)
    {
        LOG_ERROR("wifi_set_config err %d", error);
    }

error:
    free(net);

    return error;
}
```

Isn't it much better? As you can see, the semantics of the code didn't change, but it's now much more easy to read and follow trough! Just a `goto` statement made everything more clear. Of course this is a simple example: on more complex examples the difference is even more noticeable!

## Conclusion

Write code that is tidy, easier for the reader to understand. Break "rules" where breaking those rules will make you code more readable.

Writing code is a creative and iterative process: write some code, make it work and do the things it needs to do, then read it again and tidy it till you are convinced that it looks good, as you would do when writing a letter. Don't be tempted to leave it as is as soon as it works.

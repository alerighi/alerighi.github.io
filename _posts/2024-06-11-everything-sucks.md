---
layout: default
title: Programmare nel 2024
title_left: BLOG
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
description: Alcune considerazioni sul fare lo sviluppatore software nel 2024
---

# Programmare nel 2024

Qualche giorno fa un mio collega mi dice che uno script python che usiamo internamente sul suo PC non funziona, Syntax Error. Io da buon sviluppatore dico che sulla mia macchina va, probabilmente era il codice non aggiornato. Facciamo git pull, git clean -f, git reset --hard origin/master, cancelliamo il repository e lo ricloniamo (ma si sà), nulla. Syntax Error.

Al che, verifichiamo le versioni di python. Sulla mia macchina, python 3.12, sulla sua, python 3.11. Ma da una minor all'altra che vuoi che sia cambiato? Beh. Viene fuori che in effetti qualcosa è cambiato, infatti dal 3.12 hanno introdotto le multiline f-string (qualcosa che nemmeno sapevo esistesse). 

E infatti io non lo sapevo, ma il formattatore di codice python di VSCode (presumo autopep8) sì. Al che, visto che nel 2024 è tassativo che tutti i file siano formattati perfettamente altrimenti si finisce nel peggior girone dell'inferno, qualcuno (io, ndr) avendo salvato il file ha di fatto rotto il programma, senza rendersene conto, per chiunque usa una versione di python più vecchia dell'ultima. 

## Si stava meglio quando si stava peggio 

Scherzosamente, dopo aver tirato in ballo divinità e svariati santi, diciamo che si stava meglio quando si stava peggio, con il buon vecchio python 2.7.  

Quando ho iniziato a programmare era il lontano 2010, facevo la seconda superiore e passavo le serate al PC (col senno di poi, era meglio avessi fatto altre esperienze, ma tant'è). Sviluppare era estremamente più facile. 

Prendiamo lo sviluppo web. C'era lo stack LAMP (Linux-Apache-Mysql-PHP, per i millennials), seguendo un video su youtube del buon MorroLinux avevo installato il mio server, avevo buttato dei file in /var/www, e mi ero fatto il sito. E per deployarlo? Non serviva una CI, non c'era il "DevOps" (che merita un altro articolo!), FileZilla e si copiavano i file con FTP sul proprio server (visto che ero un sedicenne squattrinato, altervista.org ovviamente!). O in alternativa, se avevi un server tuo (server fisico, i VPS erano agli albori) usavi VIM per modificare direttamente i file sul server. 

Ora? Da dove dobbiamo iniziare? Prima di tutto se non hai un framework non sei nessuno. Cosa usare? React? VUE? Svelte? Nuxt? Dopo di che, scrivere in JavaScript è diventato retro, vorrai mica usare un linguaggio **non type-safe**? Ovviamente no, quindi aggiungiamo TypeScript. Ma ovviamente i browser non supportano nativamente TypeScript, quindi dobbiamo compilare. Ed in effetti, vogliamo anche rendere tutta questa pila di merda di svariati Mb di dipendenze in qualche modo gestibile, quindi serve un bundler? Che usare? Webpack? Vite? I dati come li carichiamo? Mica il browser può fare query ad un database, serve un backend REST. Ma che REST, quella era roba d'altri tempi, meglio GraphQL che è **type-safe**. In che linguaggio farlo? Meh, qualsiasi va bene ma se vuoi essere fancy al giorno d'oggi devi usare assolutamente Rust! Infine che dici, beh la pagina ci mette una vita a caricare perché deve scaricare 100Mb di JS e fare N+1 query GraphQL per caricare i dati? Beh certo, oggigiorno vuoi mica usare il *server-side-rendering* no? 

Aspetta... quindi abbiamo rifatto il giro, siamo tornati a fare quel che si faceva con il buon PHP e jQuery con un sistema iper complesso, che nessuno sa esattamente spiegare come funziona, che ha mille dipendenze, e che serve un browser della NASA per aprire il sito, e comunque ci mette 5 secondi a caricare tutto. WOW!

## Conclusioni

Gli stack tecnologici di oggi introducono tutta una serie di complessità non necessarie. Negli ultimi 10 anni, ma diciamo anche 20, i computer fanno grossomodo le stesse cose di prima. Eppure per fare le stesse cose la complessità si è impennata vertiginosamente, e la colpa è forse di noi sviluppatori, che ci facciamo prendere dalla foga di stare al passo con l'ultima novità a tutti i costi. 

Dovremmo prendere esempio da UNIX più spesso. Concetti degli anni 80 sono grossomodo ancora lì, anche se Linux ha portato delle evoluzioni (in certi casi discutibili) le API ed i concetti core non sono cambiati. Lo stack tecnologico JS che usiamo oggi l'anno prossimo sarà obsoleto, come usare Windows 98 oggigiorno. 

Quando all'asilo chiedevano a me cosa avrei voluto fare da grande, la risposta era l'elettricista. Perché diamine ho cambiato idea? 

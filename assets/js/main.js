const KEY_MAP = new Map()

document.querySelectorAll('.nav-key').forEach(el => {
    const key = el.childNodes[0].textContent
    const link = el.childNodes[2]
    KEY_MAP.set(key, link)
})

document.addEventListener('keydown', e => {
    if (KEY_MAP.has(e.key)) {
        e.preventDefault()
        KEY_MAP.get(e.key).click()
    }
})

window.onload = function() {
    // Nothing to see here. This is fully GDPR compliant, trust me.
    // I will not use this data for anything, just to know if somebody
    // reads what I write :). It will not be transmitted to third parties
    // or anything like it, and it's completely anonymous.
    // Feel free to block JavaScript or disable the local storage, if you don't want.

    let id = null
    try {
        id = localStorage.getItem("analytics_id")
        if (!id) {
            id = btoa(Math.random())
            localStorage.setItem("analytics_id", id)
        }
    } catch {}

    fetch("https://analytics.alerighi.it/record.php", {
        method: "post",
        body: JSON.stringify({
            location: document.location.href,
            referrer: document.referrer,
            date: Date(),
            id,
        }),
    })
}

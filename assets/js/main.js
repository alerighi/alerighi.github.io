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

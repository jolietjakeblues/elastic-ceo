# Installatie elastic-ceo

Plaats `404.html`, `favicon.svg`, `favicon.ico` en desgewenst de PNG-bestanden in de statische webmap (`web/` wanneer die is aangemaakt). De 404-pagina is zelfstandig en heeft geen externe CSS of scripts nodig.

Voeg in `index.html` binnen `<head>` toe:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="/favicon.ico" sizes="any">
```

Zorg dat de hosting bij onbekende pagina’s `404.html` met HTTP-status 404 teruggeeft. Bij Cloudflare Workers Static Assets werkt `404.html` als 404-pagina; controleer het gedrag na deployment. De knop op de 404-pagina gaat naar `/`.

Dit ontwerp gebruikt de RCE-kleuren, maar bevat geen rijkslogo.

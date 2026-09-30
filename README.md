# DC Barbershop: website demo

The first version of the DC Barbershop website (Rua de Faria Guimarães 214, Porto), built by Innoweb. Everything the client sees is in Brazilian Portuguese.

## Run it

```bash
npm install
npm run dev        # http://localhost:5180
npm run build      # static build in dist/
npm run preview    # serves the build
```

| Page | URL | What it does |
|---|---|---|
| Site | `/` | Scroll-driven landing page, price list, booking |
| Client account | `/conta/` | Sign in, upcoming bookings, reschedule, invoices, emails received, reminder settings |
| Admin | `/admin/` | Agenda, bookings, clients, invoices sent by email, email marketing, sent-mail log. No password yet |

## How it is built

- Vite, vanilla JS modules, GSAP (ScrollTrigger) and Lenis for smooth scroll. No framework.
- Every scene on the landing page is a tall section with a `position: sticky` "camera". A GSAP timeline scrubbed by scroll animates what is inside. See `src/js/site/cenas/`.
- The hexagon used across the site comes from the LED hexagon lights on the shop ceiling. `src/js/site/forma.js` morphs a rounded rectangle into that hexagon.
- Font: Cabinet Grotesk (Fontshare, self-hosted in `public/fonts`).

### Data (no backend yet)

All data lives in the browser (`localStorage`) through `src/js/data/store.js`. The functions are async on purpose: to connect Supabase, replace the calls in `store.js` and `api.js` and keep the rest of the code as is.

- `catalog.js`: the real services, prices, durations, team and opening hours, taken from AppBarber (September 2026).
- `api.js`: availability, bookings, accounts, invoices, the email outbox, campaigns and automations.
- `seed.js`: realistic demo data, generated once per browser. The admin has a "Restaurar dados de demonstração" button that regenerates it.
- Email sending is simulated. Every email (confirmation, invoice, reminder, campaign) is written to the outbox and shown in the admin and the client account. Connecting a provider (Resend, Postmark or a Supabase Edge Function) means sending the HTML already stored in each email record.

### Media

- Photos and videos from the client's own Instagram (@dcbarbershop.porto) and their AppBarber page: team, shop, cuts, videos.
- Stock photos from Unsplash (free licence) where the client had nothing suitable: some portraits in the honeycomb, the combo badges, the price-list images and the foliage.
- No image appears twice on the site.

## Check with the client before launch

- The "Sobrancelha" price is 1 € on AppBarber, which looks like a typo.
- The team bios are placeholders written from their Instagram.
- The WhatsApp number comes from AppBarber.
- Some policy text is assumed, for example rescheduling up to 2 hours before.
- Two stock photos carry small third-party logos: a "Parlor 55" cape in the price list's combos image, and "Supply" labels in one admin email image.

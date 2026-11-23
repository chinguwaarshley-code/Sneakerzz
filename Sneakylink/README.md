# SneakyLink

A footwear storefront and inventory dashboard built with Spring Boot 3, Java 17, Spring Data JPA, H2, Thymeleaf, and vanilla JavaScript.

## Run locally

Install Java 17+ and Maven, then run:

```powershell
$env:SNEAKYLINK_MANAGER_PASSWORD = "choose-a-private-password"
mvn spring-boot:run
```

Open [http://localhost:8080](http://localhost:8080). The default manager password for local development is `bluekick`; configure `SNEAKYLINK_MANAGER_PASSWORD` before exposing the app or using it outside a local demo. Catalog and order data are stored in the `./data/sneakylink` H2 database. Fifty shoe styles are seeded automatically on first startup.

## What is included

- Customer and manager roles, with a password gate for manager sessions.
- Searchable catalog with colorway, material, and shoe-size filters.
- A persistent browser-local shopping bag and inventory-aware quantities.
- Delivery and pickup schedules generated from the current date.
- Shipping/contact checkout, stock decrement, and persisted demo orders.
- Manager inventory editing for style name, colorway, material, price, stock, and image URL; manager order overview.
- Responsive black-and-blue storefront.

## Payment and production notes

Checkout is a demonstration flow, not a payment processor. Card fields are checked in the browser, but card details are never sent to or stored by the server, and no charge is made. Connect a PCI-compliant payment provider before accepting real payments. Set a strong manager password, use HTTPS, and add production-grade CSRF protection, rate limiting, account management, and operational database backups before deployment.

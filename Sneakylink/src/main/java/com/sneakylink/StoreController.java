package com.sneakylink;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class StoreController {
    private final ProductRepository products;
    private final StoreOrderRepository orders;
    private final String managerPassword;

    public StoreController(ProductRepository products, StoreOrderRepository orders,
                           @Value("${sneakylink.manager-password}") String managerPassword) {
        this.products = products;
        this.orders = orders;
        this.managerPassword = managerPassword;
    }

    @GetMapping("/api/products")
    List<Product> catalog(@RequestParam(required = false) String q,
                          @RequestParam(required = false) String color,
                          @RequestParam(required = false) String material,
                          @RequestParam(required = false) Integer size) {
        return products.findAll().stream()
            .filter(p -> q == null || (p.getName() + " " + p.getBrand() + " " + p.getCategory())
                .toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT)))
            .filter(p -> color == null || color.isBlank() || p.getColorway().equalsIgnoreCase(color))
            .filter(p -> material == null || material.isBlank() || p.getMaterial().equalsIgnoreCase(material))
            .filter(p -> size == null || List.of(p.getSizes().split(",")).contains(String.valueOf(size)))
            .toList();
    }

    @PatchMapping("/api/products/{id}")
    Product updateProduct(@PathVariable Long id, @RequestBody ProductUpdate update, HttpServletRequest request) {
        requireRole(request, "manager");
        if (update.name() == null || update.name().isBlank() || update.brand() == null ||
            update.category() == null || update.colorway() == null || update.material() == null ||
            update.sizes() == null || !update.sizes().matches("\\d{1,2}(,\\d{1,2})*") ||
            update.imageUrl() == null || update.description() == null ||
            !Double.isFinite(update.price()) || update.price() < 0 || update.stock() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product details are invalid.");
        }
        Product product = products.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found."));
        product.update(update);
        return products.save(product);
    }

    @GetMapping("/api/auth/me")
    Map<String, String> session(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return session == null || session.getAttribute("role") == null
            ? Map.of("role", "guest")
            : Map.of("role", (String) session.getAttribute("role"),
                     "name", (String) session.getAttribute("name"));
    }

    @PostMapping("/api/auth/login")
    Map<String, String> login(@RequestBody LoginRequest body, HttpServletRequest request) {
        if (body.name() == null || body.name().isBlank() || body.role() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter your name and choose a role.");
        }
        String role = body.role().toLowerCase(Locale.ROOT);
        if (!role.equals("customer") && !role.equals("manager")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose customer or manager.");
        }
        if (role.equals("manager") &&
            (body.password() == null || !java.security.MessageDigest.isEqual(
                body.password().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                managerPassword.getBytes(java.nio.charset.StandardCharsets.UTF_8)))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Manager password is incorrect.");
        }
        request.getSession(true);
        request.changeSessionId();
        request.getSession().setAttribute("role", role);
        request.getSession().setAttribute("name", body.name().trim());
        return Map.of("role", role, "name", body.name().trim());
    }

    @PostMapping("/api/auth/logout")
    Map<String, String> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return Map.of("status", "signed out");
    }

    @GetMapping("/api/schedule")
    Map<String, Object> schedule() {
        LocalDate today = LocalDate.now();
        DateTimeFormatter format = DateTimeFormatter.ofPattern("EEE, MMM d");
        return Map.of(
            "delivery", List.of(today.plusDays(3).format(format), today.plusDays(4).format(format),
                                today.plusDays(5).format(format)),
            "pickup", List.of(today.plusDays(1).format(format) + " · 10:00–12:00",
                              today.plusDays(1).format(format) + " · 14:00–16:00",
                              today.plusDays(2).format(format) + " · 12:00–14:00")
        );
    }

    @PostMapping("/api/orders")
    @Transactional
    Map<String, Object> createOrder(@RequestBody CheckoutRequest body, HttpServletRequest request) {
        requireRole(request, "customer");
        if (body.lines() == null || body.lines().isEmpty() || body.customerName() == null ||
            body.email() == null || body.phone() == null || body.fulfillment() == null ||
            body.scheduledFor() == null || body.paymentLastFour() == null ||
            !body.paymentLastFour().matches("\\d{4}") ||
            !(body.fulfillment().equals("delivery") || body.fulfillment().equals("pickup")) ||
            body.customerName().isBlank() || body.email().isBlank() || body.phone().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complete all checkout fields.");
        }
        if (body.fulfillment().equals("delivery") &&
            (body.address() == null || body.address().isBlank() || body.city() == null || body.city().isBlank() ||
             body.region() == null || body.region().isBlank() || body.postalCode() == null || body.postalCode().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complete your shipping address.");
        }
        Map<Long, Integer> quantities = new HashMap<>();
        for (CartLine line : body.lines()) {
            if (line.productId() == null || line.quantity() < 1 || line.quantity() > 10 || line.size() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Item quantity is invalid.");
            }
            quantities.merge(line.productId(), line.quantity(), Integer::sum);
        }
        double total = 0;
        Map<Long, Product> orderProducts = new HashMap<>();
        for (Map.Entry<Long, Integer> line : quantities.entrySet().stream()
            .sorted(Map.Entry.comparingByKey()).toList()) {
            Product product = products.findByIdForUpdate(line.getKey())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "A product is no longer available."));
            if (body.lines().stream().filter(cartLine -> cartLine.productId().equals(product.getId()))
                .anyMatch(cartLine -> !List.of(product.getSizes().split(",")).contains(cartLine.size()))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an available shoe size.");
            }
            if (line.getValue() > 10 || product.getStock() < line.getValue()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, product.getName() + " does not have enough stock.");
            }
            total += product.getPrice() * line.getValue();
            orderProducts.put(product.getId(), product);
        }
        List<String> schedule = scheduleOptions(body.fulfillment());
        if (!schedule.contains(body.scheduledFor())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an available delivery or pickup time.");
        }
        String number = "SL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        String itemSummary = body.lines().stream().map(line -> {
            Product product = orderProducts.get(line.productId());
            return product.getName() + " · US " + line.size() + " × " + line.quantity();
        }).collect(java.util.stream.Collectors.joining("; "));
        StoreOrder saved = orders.save(new StoreOrder(
            number, body.customerName().trim(), body.email().trim(), body.phone().trim(),
            body.address() == null ? "" : body.address().trim(),
            body.city() == null ? "" : body.city().trim(),
            body.region() == null ? "" : body.region().trim(),
            body.postalCode() == null ? "" : body.postalCode().trim(),
            body.fulfillment(), body.scheduledFor(), itemSummary, total
        ));
        for (Map.Entry<Long, Integer> line : quantities.entrySet().stream()
            .sorted(Map.Entry.comparingByKey()).toList()) {
            Product product = Objects.requireNonNull(orderProducts.get(line.getKey()));
            product.update(new ProductUpdate(product.getName(), product.getBrand(), product.getCategory(),
                product.getColorway(), product.getMaterial(), product.getSizes(), product.getPrice(),
                product.getStock() - line.getValue(), product.getImageUrl(), product.getDescription()));
        }
        return Map.of("orderNumber", saved.getOrderNumber(), "total", total,
                      "scheduledFor", saved.getScheduledFor(), "payment", "simulated");
    }

    @GetMapping("/api/orders")
    List<StoreOrder> listOrders(HttpServletRequest request) {
        requireRole(request, "manager");
        return orders.findAll();
    }

    private void requireRole(HttpServletRequest request, String role) {
        HttpSession session = request.getSession(false);
        if (session == null || !role.equals(session.getAttribute("role"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sign in with the required account role.");
        }
    }

    private List<String> scheduleOptions(String fulfillment) {
        LocalDate today = LocalDate.now();
        DateTimeFormatter format = DateTimeFormatter.ofPattern("EEE, MMM d");
        if (fulfillment.equals("delivery")) {
            return List.of(today.plusDays(3).format(format), today.plusDays(4).format(format),
                           today.plusDays(5).format(format));
        }
        return List.of(today.plusDays(1).format(format) + " · 10:00–12:00",
                       today.plusDays(1).format(format) + " · 14:00–16:00",
                       today.plusDays(2).format(format) + " · 12:00–14:00");
    }

    record ProductUpdate(String name, String brand, String category, String colorway, String material,
                         String sizes, double price, int stock, String imageUrl, String description) {}
    record LoginRequest(String name, String role, String password) {}
    record CartLine(Long productId, int quantity, String size) {}
    record CheckoutRequest(String customerName, String email, String phone, String address, String city,
                           String region, String postalCode, String fulfillment, String scheduledFor,
                           String paymentLastFour, List<CartLine> lines) {}
}

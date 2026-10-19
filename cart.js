document.addEventListener("DOMContentLoaded", () => {
    const CART_STORAGE_KEY = "uniquedorrix-cart-v1";
    const feedback = document.getElementById("cart-feedback");
    const cartItems = document.getElementById("cart-items");
    const cartSubtotal = document.getElementById("cart-subtotal");
    const emptyCart = document.getElementById("empty-cart");
    const checkoutSection = document.getElementById("checkout-section");
    const checkoutForm = document.getElementById("checkout-form");
    const confirmation = document.getElementById("order-confirmation");
    const orderSubmitButton = document.getElementById("order-submit");

    function showFeedback(message, isError = false) {
        if (!feedback) {
            return;
        }
        feedback.textContent = message;
        feedback.classList.toggle("error", isError);
    }

    function readCart() {
        try {
            const storedCart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
            if (!Array.isArray(storedCart)) {
                throw new Error("Stored cart data is not a list.");
            }

            return storedCart.filter(item =>
                item &&
                typeof item.id === "string" &&
                item.id.length > 0 &&
                typeof item.name === "string" &&
                Number.isFinite(Number(item.price)) &&
                Number(item.price) > 0 &&
                Number.isInteger(Number(item.quantity)) &&
                Number(item.quantity) > 0 &&
                Number.isInteger(Number(item.stock)) &&
                Number(item.stock) > 0
            ).map(item => ({
                ...item,
                size: typeof item.size === "string" ? item.size : "",
                price: Number(item.price),
                stock: Number(item.stock),
                quantity: Number(item.quantity)
            }));
        } catch (error) {
            console.error("Could not read the saved cart.", error);
            showFeedback("Your saved cart could not be read. Please clear this site's stored data and try again.", true);
            return [];
        }
    }

    function saveCart(cart) {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
            updateCartCount(cart);
            renderCart(cart);
            return true;
        } catch (error) {
            console.error("Could not save the cart.", error);
            showFeedback("Your cart could not be saved in this browser. Check browser storage settings and try again.", true);
            return false;
        }
    }

    function formatPrice(amount) {
        return `₦${Number(amount).toLocaleString("en-NG")}`;
    }

    function updateCartCount(cart = readCart()) {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        document.querySelectorAll("[data-cart-count]").forEach(element => {
            element.textContent = String(count);
        });
    }

    function createCartRow(item) {
        const row = document.createElement("article");
        row.className = "cart-item";

        const image = document.createElement("img");
        image.className = "cart-item-image";
        image.src = item.imageSrc || "udv.jpg";
        image.alt = item.name;

        const details = document.createElement("div");
        details.className = "cart-item-details";

        const category = document.createElement("small");
        category.textContent = item.category || "NEW ARRIVAL";
        const name = document.createElement("h3");
        name.textContent = item.name;
        const size = document.createElement("p");
        size.textContent = item.size ? `Size: ${item.size}` : "";
        const price = document.createElement("p");
        price.textContent = `${formatPrice(item.price)} each`;
        details.append(category, name);
        if (item.size) {
            details.appendChild(size);
        }
        details.appendChild(price);

        const quantity = document.createElement("div");
        quantity.className = "cart-item-quantity";

        const decrease = document.createElement("button");
        decrease.type = "button";
        decrease.textContent = "−";
        decrease.setAttribute("aria-label", `Remove one ${item.name}`);
        decrease.dataset.cartAction = "decrease";
        decrease.dataset.productId = item.id;

        const quantityValue = document.createElement("span");
        quantityValue.textContent = String(item.quantity);
        quantityValue.setAttribute("aria-label", "Quantity");

        const increase = document.createElement("button");
        increase.type = "button";
        increase.textContent = "+";
        increase.setAttribute("aria-label", `Add one ${item.name}`);
        increase.dataset.cartAction = "increase";
        increase.dataset.productId = item.id;
        increase.disabled = item.quantity >= item.stock;

        quantity.append(decrease, quantityValue, increase);

        const lineTotal = document.createElement("strong");
        lineTotal.className = "cart-item-total";
        lineTotal.textContent = formatPrice(item.price * item.quantity);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "cart-remove";
        remove.textContent = "Remove";
        remove.dataset.cartAction = "remove";
        remove.dataset.productId = item.id;

        row.append(image, details, quantity, lineTotal, remove);
        return row;
    }

    function renderCart(cart = readCart()) {
        if (!cartItems) {
            return;
        }

        cartItems.replaceChildren(...cart.map(createCartRow));
        const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
        if (cartSubtotal) {
            cartSubtotal.textContent = formatPrice(subtotal);
        }
        if (emptyCart) {
            emptyCart.hidden = cart.length > 0;
        }
        if (checkoutSection) {
            checkoutSection.hidden = cart.length === 0;
        }
    }

    document.addEventListener("click", event => {
        const addButton = event.target.closest(".add-to-cart-btn");
        if (addButton) {
            const item = {
                id: addButton.dataset.productId || "",
                name: addButton.dataset.productName || "",
                imageSrc: addButton.dataset.productImage || "",
                category: addButton.dataset.productCategory || "",
                size: addButton.dataset.productSize || "",
                price: Number(addButton.dataset.productPrice),
                stock: Number(addButton.dataset.productStock),
                quantity: 1
            };

            if (!item.id || !Number.isFinite(item.price) || item.price <= 0 ||
                !Number.isInteger(item.stock) || item.stock < 1) {
                showFeedback("This item is not available to add yet.", true);
                return;
            }

            const cart = readCart();
            const existingItem = cart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                existingItem.stock = item.stock;
                existingItem.size = item.size;
                if (existingItem.quantity >= item.stock) {
                    showFeedback("You already have the available quantity of this item in your cart.");
                    return;
                }
                existingItem.quantity += 1;
            } else {
                cart.push(item);
            }

            if (saveCart(cart)) {
                showFeedback(`${item.name} added to your cart.`);
            }
            return;
        }

        const actionButton = event.target.closest("[data-cart-action]");
        if (!actionButton) {
            return;
        }

        const productId = actionButton.dataset.productId;
        const cart = readCart();
        const item = cart.find(cartItem => cartItem.id === productId);
        if (!item) {
            return;
        }

        switch (actionButton.dataset.cartAction) {
            case "increase":
                if (item.quantity < item.stock) {
                    item.quantity += 1;
                } else {
                    showFeedback("You cannot add more than the available stock.");
                    return;
                }
                break;
            case "decrease":
                item.quantity -= 1;
                if (item.quantity < 1) {
                    cart.splice(cart.indexOf(item), 1);
                }
                break;
            case "remove":
                cart.splice(cart.indexOf(item), 1);
                break;
            default:
                return;
        }

        showFeedback("");
        saveCart(cart);
    });

    if (checkoutForm) {
        checkoutForm.addEventListener("submit", async event => {
            event.preventDefault();

            const cart = readCart();
            if (cart.length === 0) {
                showFeedback("Your cart is empty.", true);
                renderCart(cart);
                return;
            }

            if (!window.storeSupabase) {
                showFeedback("Checkout is unavailable because the Supabase connection is not configured.", true);
                return;
            }

            const formData = new FormData(checkoutForm);
            const items = cart.map(item => ({
                id: item.id,
                quantity: item.quantity
            }));

            orderSubmitButton.disabled = true;
            orderSubmitButton.textContent = "Submitting order...";
            showFeedback("");

            try {
                const { data, error } = await window.storeSupabase.rpc("request_purchase_quote", {
                    p_items: items,
                    p_customer_name: formData.get("customer_name"),
                    p_email: formData.get("email"),
                    p_phone: formData.get("phone"),
                    p_address: formData.get("address"),
                    p_city: formData.get("city"),
                    p_state: formData.get("state")
                });

                if (error) {
                    throw error;
                }

                const orderId = typeof data === "string" ? data : data?.id;
                if (!orderId) {
                    throw new Error("The order was submitted but no order reference was returned.");
                }

                const message = `Hello, I submitted order request ${orderId}. Please confirm the delivery fee and payment link.`;
                const whatsappLink = document.getElementById("order-whatsapp-link");
                if (whatsappLink) {
                    whatsappLink.href = `https://wa.me/2348038184891?text=${encodeURIComponent(message)}`;
                }
                const orderReference = document.getElementById("order-reference");
                if (orderReference) {
                    orderReference.textContent = orderId;
                }
                const orderSubtotal = document.getElementById("order-subtotal");
                if (orderSubtotal) {
                    const subtotal = Number(data?.subtotal);
                    orderSubtotal.textContent = Number.isFinite(subtotal)
                        ? formatPrice(subtotal)
                        : "to be confirmed";
                }

                let cartCleared = true;
                try {
                    localStorage.removeItem(CART_STORAGE_KEY);
                } catch (storageError) {
                    cartCleared = false;
                    console.error("Order submitted, but the saved cart could not be cleared.", storageError);
                }
                updateCartCount(cartCleared ? [] : cart);
                renderCart(cartCleared ? [] : cart);
                checkoutSection.hidden = true;
                confirmation.hidden = false;
                showFeedback(cartCleared ? "" : "Your order was submitted, but the cart is still saved in this browser.");
            } catch (error) {
                console.error("Could not submit purchase request.", error);
                showFeedback(error.message || "We could not submit your order request. Please try again.", true);
            } finally {
                orderSubmitButton.disabled = false;
                orderSubmitButton.textContent = "Request Order & Delivery Quote";
            }
        });
    }

    updateCartCount();
    renderCart();
});

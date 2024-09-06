# Paid PWA

A web component and Vue 3 component for handling paid PWA installations using Stripe and the Payment Request API.

## Motivation

As web developers, it can be challenging to monetize Progressive Web Applications (PWAs). Traditional app stores offer ways to charge for downloads, but the open web has lagged behind in providing developers with a straightforward way to monetize their apps. **Paid PWA** aims to bridge this gap by providing a simple and reusable solution that allows web developers to charge for PWA installations securely.

With **Paid PWA**, developers can easily set up secure payment processing using Stripe and leverage the Payment Request API to create a seamless user experience. The package supports both standard web components and Vue 3 applications, making it versatile and easy to integrate into any web project.

## Features

- **Web Component**: A custom HTML element (`<paid-pwa>`) to handle payments and PWA installations.
- **Vue 3 Component**: A Vue 3 component (`PaidPwa`) for seamless integration into Vue 3 applications.
- **Secure Payment Handling**: Integrates with Stripe to securely process payments and tokenize card details.
- **PWA Installation**: Dynamically registers the service worker upon successful payment, enabling PWA installation.
- **Customizable**: Easily configurable via HTML attributes or Vue props to suit different environments and use cases.

## Installation

To use the **Paid PWA** package, install it via npm:

```bash
npm install @mastashake08/paid-pwa
```

Usage
Web Component
Include the component in your HTML file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PWA Marketplace</title>
  <!-- Import Stripe.js -->
  <script src="https://js.stripe.com/v3/"></script>
  <!-- Import the web component module -->
  <script type="module" src="node_modules/paid-pwa/paid-pwa.js"></script>
</head>
<body>
  <!-- Use the custom web component -->
  <paid-pwa
    stripe-public-key="pk_test_YourStripePublicKey"
    currency="usd"
    amount="199"
    country="US"
    supported-networks="visa,mastercard,amex,discover"
    supported-types="credit,debit"
    server-endpoint="/your-server-endpoint"
    service-worker-url="/path/to/service-worker.js">
  </paid-pwa>
</body>
</html>
```

Vue 3 Component
Use the Vue 3 component in your application:

```vue

<template>
  <div id="app">
    <PaidPwa
      stripe-public-key="pk_test_YourStripePublicKey"
      :amount="199"
      currency="usd"
      country="US"
      :supported-networks="['visa', 'mastercard', 'amex', 'discover']"
      :supported-types="['credit', 'debit']"
      server-endpoint="/your-server-endpoint"
      service-worker-url="/path/to/service-worker.js"
    />
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import PaidPwa from 'paid-pwa/vue'; // Import the Vue component from the package

export default defineComponent({
  name: 'App',
  components: {
    PaidPwa,
  },
});
</script>
```
Support My Work
If you find this project useful, consider supporting my work!

GitHub Sponsors: mastashake08
Patreon: mastashake08
Your support helps me continue to create open-source software that benefits the web development community!

Contact
Email: jyrone.parker@gmail.com
Website: https://jyroneparker.com
License
This project is licensed under the MIT License. See the LICENSE file for details.

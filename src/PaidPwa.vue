<template>
    <div>
      <div id="express-checkout-element" class="text-center">
        <!-- Stripe Express Checkout Element will be inserted here -->
      </div>
      <div id="error-message" class="text-red-500 mt-4">
        <!-- Display error message here -->
      </div>
      <button
        class="rounded-md bg-green-500 px-5 my-2"
        @click="buy"
      >
        Purchase and Install PWA
      </button>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { loadStripe } from '@stripe/stripe-js';
  
  const registerServiceWorker = () => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register(props.serviceWorkerUrl).then((registration) => {
            console.log('Service Worker registered successfully:', registration);
          }).catch((err) => {
            console.error('Service Worker registration failed:', err);
          });
        } else {
          console.warn('Service Workers are not supported in this browser.');
        }
      };
  // Define the required props
  const props = defineProps({
    stripePublicKey: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    serverEndpoint: {
      type: String,
      required: true,
    },
    serviceWorkerUrl: {
      type: String,
      required: true,
    },
  });
  
  const stripe = ref(null);
  
  const buy = async () => {
    const appearance = {
      theme: 'stripe',
    };
  
    const options = {
      buttonType: {
        applePay: 'buy',
        googlePay: 'buy',
      },
    };
  
    // Initialize Stripe.js and Elements
    stripe.value = await loadStripe(props.stripePublicKey);
    const elements = stripe.value.elements({
      mode: 'payment',
      amount: props.amount, // Stripe expects amount in cents
      currency: props.currency,
      appearance,
    });
  
    // Create the Express Checkout element
    const expressCheckoutElement = elements.create('expressCheckout', options);
    expressCheckoutElement.mount('#express-checkout-element');
  
    const handleError = (error) => {
      const messageContainer = document.querySelector('#error-message');
      messageContainer.textContent = error.message;
    };
  
    // Handle the confirmation of the payment
    expressCheckoutElement.on('confirm', async () => {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        handleError(submitError);
        return;
      }
  
      // Create the PaymentIntent on the server-side and get the client_secret
      const response = await fetch(props.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: props.amount, // Amount in cents
          currency: props.currency,
        }),
      });
      const { client_secret: clientSecret } = await response.json();
  
      // Confirm the payment using Stripe.js
      const { error } = await stripe.value.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href, // Return URL after successful payment
        },
        redirect: 'if_required'
      });
  
      if (error) {
        handleError(error);
      } else {
        console.log('Payment successful');
        // The payment UI closes automatically, and the user is redirected.
        registerServiceWorker();
      }
    });
  };
  
  onMounted(async () => {
    // Preload the Stripe instance when the component is mounted
    stripe.value = await loadStripe(props.stripePublicKey);
  });
  </script>
  
  <style scoped>
  #express-checkout-element {
    margin-top: 20px;
  }
  </style>
  
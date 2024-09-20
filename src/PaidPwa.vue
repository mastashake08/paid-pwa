<template>
    <div class="flex justify-center items-center min-h-screen p-4 bg-gray-900 text-white">
      <div v-if="paymentRequestAvailable">
        <div id="payment-request-button"></div>
      </div>
      <form v-else @submit.prevent="handleSubmit">
        <div id="card-element" class="mb-4"></div>
        <button
          type="submit"
          :disabled="isProcessing"
          class="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
        >
          {{ isProcessing ? 'Processing...' : 'Purchase and Install PWA' }}
        </button>
        <div v-if="errorMessage" class="mt-4 text-red-500">
          {{ errorMessage }}
        </div>
      </form>
    </div>
  </template>
  
  <script>
  import { ref, onMounted } from 'vue';
  import { loadStripe } from '@stripe/stripe-js';
  
  export default {
    name: 'PaidPwa',
    props: {
      stripePublicKey: {
        type: String,
        required: true,
      },
      currency: {
        type: String,
        default: 'usd',
      },
      amount: {
        type: Number,
        required: true,
      },
      serverEndpoint: {
        type: String,
        required: true,
      },
      serviceWorkerUrl: {
        type: String,
        required: true,
      },
    },
    setup(props) {
      const stripe = ref(null);
      const elements = ref(null);
      const cardElement = ref(null);
      const paymentRequest = ref(null);
      const paymentRequestAvailable = ref(false);
      const isProcessing = ref(false);
      const errorMessage = ref(null);
  
      onMounted(async () => {
        stripe.value = await loadStripe(props.stripePublicKey);
        elements.value = stripe.value.elements();
  
        // Setup Payment Request Button
        setupPaymentRequest();
  
        // If Payment Request is not available, fall back to card form
        if (!paymentRequestAvailable.value) {
          cardElement.value = elements.value.create('card');
          cardElement.value.mount('#card-element');
        }
      });
  
      const setupPaymentRequest = () => {
        paymentRequest.value = stripe.value.paymentRequest({
          country: 'US',
          currency: props.currency,
          total: {
            label: 'PWA Purchase',
            amount: props.amount,
          },
          requestPayerName: true,
          requestPayerEmail: true,
        });
  
        // Check the availability of the Payment Request Button
        paymentRequest.value.canMakePayment().then((result) => {
          if (result) {
            paymentRequestAvailable.value = true;
            const prButton = elements.value.create('paymentRequestButton', {
              paymentRequest: paymentRequest.value,
            });
            prButton.mount('#payment-request-button');
          } else {
            paymentRequestAvailable.value = false;
          }
        });
  
        // Handle the Payment Request payment response
        paymentRequest.value.on('paymentmethod', async (ev) => {
          try {
            const response = await fetch(props.serverEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentMethodId: ev.paymentMethod.id,
                amount: props.amount,
              }),
            });
  
            if (response.ok) {
              ev.complete('success');
              registerServiceWorker();
            } else {
              throw new Error('Payment failed.');
            }
          } catch (error) {
            console.error('Payment failed:', error);
            ev.complete('fail');
          }
        });
      };
  
      const handleSubmit = async () => {
        isProcessing.value = true;
        errorMessage.value = null;
  
        const { error, token } = await stripe.value.createToken(cardElement.value);
  
        if (error) {
          errorMessage.value = error.message;
          isProcessing.value = false;
          return;
        }
  
        try {
          const response = await fetch(props.serverEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token.id, amount: props.amount }),
          });
  
          if (response.ok) {
            console.log('Payment successful!');
            registerServiceWorker();
          } else {
            throw new Error('Payment failed on server.');
          }
        } catch (err) {
          errorMessage.value = 'Payment failed. Please try again.';
        }
  
        isProcessing.value = false;
      };
  
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
  
      return { handleSubmit, paymentRequestAvailable, isProcessing, errorMessage };
    },
  };
  </script>
  
  <style>
  body {
    background-color: #1a1a1a;
  }
  </style>
  
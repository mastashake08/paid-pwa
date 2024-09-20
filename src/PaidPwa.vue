<template>
    <div class="flex justify-center items-center min-h-screen p-4 bg-gray-900 text-white">
        <form @submit.prevent="handleSubmit">
            <div id="card-element" class="mb-4">
                <!-- Stripe Card Element will be inserted here -->
            </div>
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
        const isProcessing = ref(false);
        const errorMessage = ref(null);
        const appearance = {
            theme: 'night'
        };
        onMounted(async () => {
            stripe.value = await loadStripe(props.stripePublicKey);
            elements.value = stripe.value.elements({appearance});

            cardElement.value = elements.value.create('card');
            cardElement.value.mount('#card-element');
        });

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
                const serverResponse = await fetch(props.serverEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token.id, amount: props.amount }),
                });

                if (!serverResponse.ok) throw new Error('Payment failed on server.');

                console.log('Payment successful!');
                registerServiceWorker();
                isProcessing.value = false;
            } catch (error) {
                console.error('Payment error:', error);
                errorMessage.value = 'Payment failed. Please try again.';
                isProcessing.value = false;
            }
        };

        const registerServiceWorker = () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register(props.serviceWorkerUrl)
                    .then(registration => {
                        console.log('Service Worker registered successfully:', registration);
                    })
                    .catch(err => {
                        console.error('Service Worker registration failed:', err);
                    });
            } else {
                console.warn('Service Workers are not supported in this browser.');
            }
        };

        return { handleSubmit, isProcessing, errorMessage };
    },
};
</script>

<style>
body {
    background-color: #1a1a1a;
}
</style>

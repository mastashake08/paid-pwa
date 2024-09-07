<template>
    <div>
        <button @click="handlePayment">Purchase and Install PWA</button>
    </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { loadStripe } from '@stripe/stripe-js';

export default {
    name: 'PaidPwa',
    props: {
        googleMerchantId: {
            type: String,
            required: false,
        },
        googleMerchantName: {
            type: String,
            required: false,
        },
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
        country: {
            type: String,
            default: 'US',
        },
        supportedNetworks: {
            type: Array,
            default: () => ['visa', 'mastercard', 'amex', 'discover'],
        },
        supportedTypes: {
            type: Array,
            default: () => ['credit', 'debit'],
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
        const paymentRequest = ref(null);

        onMounted(async () => {
            stripe.value = await loadStripe(props.stripePublicKey);
            setupPaymentRequest();
        });

        const setupPaymentRequest = () => {
            const applePayMethod = {
                supportedMethods: "https://apple.com/apple-pay",
                data: {
                    version: 3,
                    merchantIdentifier: props.appleMerchantIdentifier,
                    merchantCapabilities: ["supports3DS", "supportsCredit", "supportsDebit"],
                    supportedNetworks: ["amex", "discover", "masterCard", "visa"],
                    countryCode: "US",
                },
            };
            const googleMerchantInfo = {
                merchantInfo: {
                    // A merchant ID is available after approval by Google.
                    // @see {@link https://developers.google.com/pay/api/web/guides/test-and-deploy/integration-checklist}
                    merchantId: props.googleMerchantId,
                    merchantName: props.googleMerchantName
                },
            }
            const tokenizationSpecification = {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                    "gateway": "stripe",
                    "stripe:version": "2024-06-20", // your stripe API version
                    "stripe:publishableKey": props.stripePublicKey // your stripe publishable key
                }
            };
            const googlePayMethod = {
                supportedMethods: "https://google.com/pay",
                data: {
                    environment: 'TEST',
                    apiVersion: 2,
                    apiVersionMinor: 0,
                    allowedPaymentMethods: [{
                        type: 'CARD',
                        parameters: {
                            allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                            allowedCardNetworks: ["AMEX", "DISCOVER", "INTERAC", "JCB", "MASTERCARD", "VISA"]
                        },
                        tokenizationSpecification: tokenizationSpecification
                    }],
                    merchantInfo: googleMerchantInfo

                },
            };

            const supportedPaymentMethods = [
                googlePayMethod,
                applePayMethod

            ];

            paymentRequest.value = new PaymentRequest(supportedPaymentMethods, {
                total: {
                    label: 'PWA Purchase',
                    amount: { currency: props.currency, value: (props.amount / 100).toFixed(2) },
                },
            });
        };

        const handlePayment = async () => {
            try {
                const paymentResponse = await paymentRequest.value.show();
                handlePaymentResponse(paymentResponse);
            } catch (error) {
                console.error('Payment Request failed:', error);
            }
        };

        const handlePaymentResponse = async (paymentResponse) => {
            try {
                const paymentDetails = paymentResponse.details;

                const result = await stripe.value.createToken('card', {
                    number: paymentDetails.cardNumber,
                    exp_month: paymentDetails.expiryMonth,
                    exp_year: paymentDetails.expiryYear,
                    cvc: paymentDetails.cardSecurityCode,
                    name: paymentDetails.cardholderName,
                });

                if (result.error) {
                    console.error('Error creating token:', result.error.message);
                    paymentResponse.complete('fail');
                } else {
                    const serverResponse = await fetch(props.serverEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: result.token.id }),
                    });

                    if (serverResponse.ok) {
                        console.log('Payment successful!');
                        paymentResponse.complete('success');
                        registerServiceWorker();
                    } else {
                        throw new Error('Payment failed on server.');
                    }
                }
            } catch (error) {
                console.error('Payment handling error:', error);
                paymentResponse.complete('fail');
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

        return { handlePayment };
    },
};
</script>

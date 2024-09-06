export class PaidPWA extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.stripe = null;
    this.paymentRequest = null;
    this.serviceWorkerUrl = '';
    this.serverEndpoint = '';
}

  connectedCallback() {
    const stripePublicKey = this.getAttribute('stripe-public-key');
    const currency = this.getAttribute('currency') || 'usd';
    const amount = parseInt(this.getAttribute('amount'), 10) || 0;
    const country = this.getAttribute('country') || 'US';
    const supportedNetworks = (this.getAttribute('supported-networks') || 'visa,mastercard,amex,discover').split(',');
    const supportedTypes = (this.getAttribute('supported-types') || 'credit,debit').split(',');
    this.serverEndpoint = this.getAttribute('server-endpoint');
    this.serviceWorkerUrl = this.getAttribute('service-worker-url');

    this.stripe = Stripe(stripePublicKey);

    this.setupPaymentRequest({ currency, amount, country, supportedNetworks, supportedTypes });
    this.render();
  }

  render() {
      this.shadowRoot.innerHTML = `
      <button id="pay-button">Purchase and Install PWA</button> `;
      this.shadowRoot.getElementById('pay-button').addEventListener('click', () => this.showPaymentRequest());
    }   
    setupPaymentRequest({ currency, amount, country, supportedNetworks, supportedTypes }) {
        const supportedPaymentMethods = [
            {
                supportedMethods: 'basic-card',
                data: {
                    supportedNetworks,
                    supportedTypes,
                }
            }
        ];
        this.paymentRequest = new PaymentRequest(supportedPaymentMethods, {
            total: {
                label: 'PWA Purchase',
                amount: { currency, value: (amount / 100).toFixed(2) },
            },
        });

        this.paymentRequest.onpaymentmethod = (event) => this.handlePaymentResponse(event);
    }
    async showPaymentRequest() {
        if (this.paymentRequest) {
            try {
                const paymentResponse = await this.paymentRequest.show();
                this.handlePaymentResponse(paymentResponse);
            } catch (error) {
                console.error('Payment Request failed:', error);
            }
        }
    }

    async handlePaymentResponse(paymentResponse) {
        try {
            const paymentDetails = paymentResponse.details;
            const result = await this.stripe.createToken('card', {
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
                const serverResponse = await fetch(this.serverEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: result.token.id }),
                });

                if (serverResponse.ok) {
                    console.log('Payment successful!');
                    paymentResponse.complete('success');
                    this.registerServiceWorker();
                } else {
                    throw new Error('Payment failed on server.');
                }
            }
        } catch (error) {
            console.error('Payment handling error:', error);
            paymentResponse.complete('fail');
        }
    }
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(this.serviceWorkerUrl).then(registration => {
                console.log('Service Worker registered successfully:', registration);
                this.dispatchEvent(new CustomEvent('pwa-installed', { detail: { success: true } }));
            }).catch(err => {
                console.error('Service Worker registration failed:', err);
                this.dispatchEvent(new CustomEvent('pwa-installed', { detail: { success: false } }));
            });
        } else {
            console.warn('Service Workers are not supported in this browser.');
        }
    }
}

customElements.define('paid-pwa', PaidPWA);
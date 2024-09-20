export class PaidPWA extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
    this.paymentRequest = null;
    this.paymentRequestAvailable = false;
    this.serviceWorkerUrl = '';
    this.serverEndpoint = '';
  }

  async connectedCallback() {
    const stripePublicKey = this.getAttribute('stripe-public-key');
    const amount = parseInt(this.getAttribute('amount'), 10) || 0;
    this.serverEndpoint = this.getAttribute('server-endpoint');
    this.serviceWorkerUrl = this.getAttribute('service-worker-url');

    // Initialize Stripe.js
    this.stripe = Stripe(stripePublicKey);
    this.elements = this.stripe.elements();

    // Setup Payment Request Button
    await this.setupPaymentRequest(amount);
    this.render();
  }

  async setupPaymentRequest(amount) {
    // Create a payment request
    this.paymentRequest = this.stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'PWA Purchase',
        amount: amount,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Check if the payment request is available (Apple Pay, Google Pay, etc.)
    const result = await this.paymentRequest.canMakePayment();
    if (result) {
      this.paymentRequestAvailable = true;
    }

    // Handle payment method submission
    this.paymentRequest.on('paymentmethod', async (ev) => {
      try {
        const response = await fetch(this.serverEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethodId: ev.paymentMethod.id,
            amount: amount,
          }),
        });

        if (response.ok) {
          ev.complete('success');
          this.registerServiceWorker();
        } else {
          throw new Error('Payment failed.');
        }
      } catch (error) {
        console.error('Payment failed:', error);
        ev.complete('fail');
      }
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        #payment-request-button {
          margin-bottom: 16px;
        }
        .card-element {
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: white;
          margin-bottom: 20px;
        }
        #pay-button {
          background-color: #007bff;
          color: white;
          padding: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        #pay-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .error-message {
          color: red;
          margin-top: 10px;
        }
      </style>
      <div id="payment-request-button"></div>
      <div id="card-element-container"></div>
      <button id="pay-button" style="display: none;">Purchase and Install PWA</button>
      <div id="error-message" class="error-message"></div>
    `;

    // Show the Payment Request Button if available, else show the card form
    if (this.paymentRequestAvailable) {
      this.mountPaymentRequestButton();
    } else {
      this.mountCardElement();
    }
  }

  mountPaymentRequestButton() {
    const paymentRequestButton = this.elements.create('paymentRequestButton', {
      paymentRequest: this.paymentRequest,
    });
    paymentRequestButton.mount(this.shadowRoot.getElementById('payment-request-button'));
  }

  mountCardElement() {
    this.cardElement = this.elements.create('card');
    this.cardElement.mount(this.shadowRoot.getElementById('card-element-container'));

    const payButton = this.shadowRoot.getElementById('pay-button');
    const errorMessage = this.shadowRoot.getElementById('error-message');

    payButton.style.display = 'block'; // Show the pay button

    payButton.addEventListener('click', async () => {
      payButton.disabled = true;
      errorMessage.textContent = '';

      // Create a Stripe token from the card element
      const { token, error } = await this.stripe.createToken(this.cardElement);

      if (error) {
        errorMessage.textContent = error.message;
        payButton.disabled = false;
        return;
      }

      // Send the token to the server
      try {
        const response = await fetch(this.serverEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.id, amount: this.getAttribute('amount') }),
        });

        if (response.ok) {
          console.log('Payment successful!');
          this.registerServiceWorker();
        } else {
          throw new Error('Payment failed on server.');
        }
      } catch (err) {
        errorMessage.textContent = 'Payment failed. Please try again.';
      }

      payButton.disabled = false;
    });
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(this.serviceWorkerUrl)
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
          this.dispatchEvent(new CustomEvent('pwa-installed', { detail: { success: true } }));
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
          this.dispatchEvent(new CustomEvent('pwa-installed', { detail: { success: false } }));
        });
    } else {
      console.warn('Service Workers are not supported in this browser.');
    }
  }
}

customElements.define('paid-pwa', PaidPWA);

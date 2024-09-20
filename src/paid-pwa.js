export class PaidPWA extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.stripe = null;
      this.elements = null;
      this.cardElement = null;
      this.serviceWorkerUrl = '';
      this.serverEndpoint = '';
    }
  
    connectedCallback() {
      const stripePublicKey = this.getAttribute('stripe-public-key');
      const amount = parseInt(this.getAttribute('amount'), 10) || 0;
      this.serverEndpoint = this.getAttribute('server-endpoint');
      this.serviceWorkerUrl = this.getAttribute('service-worker-url');
  
      this.setupStripe(stripePublicKey);
      this.render();
    }
  
    async setupStripe(stripePublicKey) {
      this.stripe = Stripe(stripePublicKey);
      this.elements = this.stripe.elements();
  
      // Create an instance of the card Element.
      this.cardElement = this.elements.create('card');
    }
  
    render() {
      this.shadowRoot.innerHTML = `
        <style>
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
        <div id="card-element" class="card-element"></div>
        <button id="pay-button">Purchase and Install PWA</button>
        <div id="error-message" class="error-message"></div>
      `;
  
      // Mount the card element to the shadow DOM
      this.cardElement.mount(this.shadowRoot.getElementById('card-element'));
  
      // Add event listener to the payment button
      this.shadowRoot.getElementById('pay-button').addEventListener('click', () => this.handlePayment());
    }
  
    async handlePayment() {
      const payButton = this.shadowRoot.getElementById('pay-button');
      const errorMessage = this.shadowRoot.getElementById('error-message');
  
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
  
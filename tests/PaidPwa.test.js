describe('Paid PWA Web Component', () => {
  let PaidPWA;

  beforeAll(() => {
    // Mock Stripe and other dependencies
    global.Stripe = jest.fn().mockImplementation(() => ({
      createToken: jest.fn(() => Promise.resolve({ token: { id: 'test-token' } })),
    }));

    // Import the PaidPWA Web Component
    PaidPWA = require('../src/paid-pwa.js').PaidPWA;
  });

  test('should create a Stripe instance with the provided public key', () => {
    document.body.innerHTML = `<paid-pwa stripe-public-key="pk_test_YourStripePublicKey" currency="usd" amount="199" country="US" supported-networks="visa,mastercard,amex,discover" supported-types="credit,debit" server-endpoint="/your-server-endpoint" service-worker-url="/path/to/service-worker.js"></paid-pwa>`;

    const component = document.querySelector('paid-pwa');
    expect(component).toBeDefined();
    expect(global.Stripe).toHaveBeenCalledWith('pk_test_YourStripePublicKey');
  });

  test('should render the purchase button', () => {
    document.body.innerHTML = `<paid-pwa stripe-public-key="pk_test_YourStripePublicKey"></paid-pwa>`;
    const button = document.querySelector('paid-pwa').shadowRoot.querySelector('button');
    expect(button.textContent).toBe('Purchase and Install PWA');
  });
});

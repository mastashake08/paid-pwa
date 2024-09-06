import { render, fireEvent } from '@testing-library/vue';
import PaidPwa from '../src/PaidPwa.vue';

describe('PaidPwa.vue', () => {
  test('renders purchase button and handles payment', async () => {
    const stripeMock = {
      createToken: jest.fn(() => Promise.resolve({ token: { id: 'test-token' } })),
    };

    window.Stripe = jest.fn().mockReturnValue(stripeMock);

    const { getByText } = render(PaidPwa, {
      props: {
        stripePublicKey: 'pk_test_YourStripePublicKey',
        amount: 199,
        currency: 'usd',
        serverEndpoint: '/your-server-endpoint',
        serviceWorkerUrl: '/path/to/service-worker.js',
      },
    });

    const button = getByText('Purchase and Install PWA');
    expect(button).toBeInTheDocument();

    await fireEvent.click(button);

    expect(window.Stripe).toHaveBeenCalledWith('pk_test_YourStripePublicKey');
    expect(stripeMock.createToken).toHaveBeenCalled();
  });
});

import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from './App';
import racksReducer from './store/racksSlice';

const store = configureStore({
  reducer: {
    racks: racksReducer
  }
});

test.skip('renders login form', () => {
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  const loginElement = screen.getByText('Login');
  expect(loginElement).toBeInTheDocument();
});

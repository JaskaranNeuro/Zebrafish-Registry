import { render, screen, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import racksReducer from '../../store/racksSlice';
import RackGrid from '../RackGrid';
import axios from 'axios';

jest.mock('axios');

// Create a mock store
const mockStore = configureStore({
  reducer: {
    racks: racksReducer
  }
});

const TestWrapper = ({ children }) => (
  <Provider store={mockStore}>
    {children}
  </Provider>
);
// Paste mockRack here at line 25
const mockRack = {
  id: 1,
  dimensions: '3x5',
  tanks: [
    {
      id: 1,
      position: 'A1',
      size: 'REGULAR',
      fish: [{ gender: 'MALE', count: 5 }]
    },
    {
      id: 2,
      position: 'A2-A3',
      size: 'LARGE',
      fish: [
        { gender: 'FEMALE', count: 3 },
        { gender: 'MALE', count: 2 }
      ]
    }
  ]
};
describe('RackGrid', () => {
  test('displays error messages', async () => {
    const user = userEvent.setup();
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Error creating tank' } }
    });

    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    const emptyCell = screen.getByTestId('grid-cell-B1');
    const createButton = within(emptyCell).getByRole('button', { name: /create tank/i });
    
    await act(async () => {
      await user.click(createButton);
    });

    // Check error message
    expect(screen.getByText('Error creating tank')).toBeInTheDocument();

    // Check tank styling
    const singleTank = screen.getByText('A1').closest('[role="button"]');
    expect(singleTank).toHaveStyle({ backgroundColor: '#bbdefb' });

    const multiTank = screen.getByText('A2-A3').closest('[role="button"]');
    expect(multiTank).toHaveStyle({ backgroundColor: '#e3f2fd' });
  });

  test('handles tank editing', async () => {
    const user = userEvent.setup();
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    const tank = screen.getByText('A1').closest('[role="button"]');
    await user.click(tank);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const countInput = within(dialog).getByRole('spinbutton');
    await user.clear(countInput);
    await user.type(countInput, '10');

    const saveButton = within(dialog).getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/tanks/'),
        expect.objectContaining({
          subdivisions: [{ gender: 'male', count: 10 }]
        }),
        expect.any(Object)
      );
    });
  });

  test('handles grid cell hover states', async () => {
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });
    
    const emptyCell = screen.getByTestId('grid-cell-B1');
    fireEvent.mouseEnter(emptyCell);
    expect(emptyCell).toHaveStyle({ backgroundColor: '#fafafa' });

    fireEvent.mouseLeave(emptyCell);
    expect(emptyCell).toHaveStyle({ backgroundColor: '#f5f5f5' });
  });

  test('handles invalid tank position format', async () => {
    const invalidRack = {
      ...mockRack,
      tanks: [
        {
          ...mockRack.tanks[0],
          position: 'invalid'
        }
      ]
    };

    render(<RackGrid rack={invalidRack} />, { wrapper: TestWrapper });
    expect(screen.getByText(/invalid position format/i)).toBeInTheDocument();
  });

  test('updates tank count correctly', async () => {
    const user = userEvent.setup();
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    // Click tank to edit
    const tank = screen.getByText('A1').closest('[role="button"]');
    await user.click(tank);

    // Update count
    const dialog = await screen.findByRole('dialog');
    const countInput = within(dialog).getByRole('spinbutton');
    await user.clear(countInput);
    await user.type(countInput, '10');

    // Save changes
    const saveButton = within(dialog).getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Verify API call
    expect(axios.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        subdivisions: [{ gender: 'MALE', count: 10 }]
      }),
      expect.any(Object)
    );
  });

  test('handles server timeout', async () => {
    const user = userEvent.setup();
    axios.put.mockRejectedValueOnce(new Error('timeout')); // Mock timeout

    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    const tank = screen.getByText('A1').closest('[role="button"]');
    await user.click(tank);

    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(screen.getByText(/failed to update tank/i)).toBeInTheDocument();
  });

  test('validates tank position boundaries', async () => {
    const invalidRack = {
      ...mockRack,
      dimensions: '2x2',
      tanks: [
        {
          ...mockRack.tanks[0],
          position: 'C3' // Outside grid boundaries
        }
      ]
    };

    render(<RackGrid rack={invalidRack} />, { wrapper: TestWrapper });
    expect(screen.getByText(/invalid tank position/i)).toBeInTheDocument();
  });

  test('renders tanks correctly', () => {
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('MALE: 5')).toBeInTheDocument();
  });

  test('handles tank creation', async () => {
    const user = userEvent.setup();
    
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    // Debug the initial DOM
    screen.debug();
    
    const createButton = screen.getByRole('button', { name: /create tank/i });
    await user.click(createButton);
    
    // Debug after click
    screen.debug();
    
    const dialog = await screen.findByRole('dialog');
  });

  test('handles drag and drop', async () => {
    const onTankMove = jest.fn();
    render(<RackGrid rack={mockRack} onTankMove={onTankMove} />, { wrapper: TestWrapper });

    const tank = screen.getByText('A1').closest('[role="button"]');
    const dropZone = screen.getByTestId('grid-cell-B1');

    await act(async () => {
      // Simulate drag start
      fireEvent.dragStart(tank, {
        dataTransfer: {
          setData: () => {},
          effectAllowed: 'move'
        }
      });

      // Simulate drag over destination
      fireEvent.dragOver(dropZone, {
        dataTransfer: {
          dropEffect: 'move'
        }
      });

      // Simulate drop
      fireEvent.drop(dropZone);

      // Simulate drag end
      fireEvent.dragEnd(tank);
    });

    expect(onTankMove).toHaveBeenCalledWith(
      mockRack.tanks[0].id,
      'A1',
      'B1'
    );
  });

  test('validates tank subdivisions before saving', async () => {
    const user = userEvent.setup();
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    // Click tank to edit
    const tank = screen.getByText('A1').closest('[role="button"]');
    await user.click(tank);

    // Set invalid count
    const dialog = await screen.findByRole('dialog');
    const countInput = within(dialog).getByRole('spinbutton');
    await user.clear(countInput);
    await user.type(countInput, '-1');

    // Try to save
    const saveButton = within(dialog).getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Should show validation error
    expect(screen.getByText(/invalid count/i)).toBeInTheDocument();
  });

  test('handles subdivision addition and removal', async () => {
    const user = userEvent.setup();
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    // Open tank dialog
    const tank = screen.getByText('A1').closest('[role="button"]');
    await user.click(tank);

    const dialog = await screen.findByRole('dialog');

    // Add subdivision
    const addButton = within(dialog).getByRole('button', { name: /add subdivision/i });
    await user.click(addButton);

    // Should show new subdivision inputs
    const genderSelects = within(dialog).getAllByLabelText(/gender/i);
    expect(genderSelects).toHaveLength(2);

    // Remove subdivision
    const removeButtons = within(dialog).getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    // Should remove subdivision
    expect(within(dialog).getAllByLabelText(/gender/i)).toHaveLength(1);
  });

  test('displays loading state during API calls', async () => {
    const user = userEvent.setup();
    // Mock slow API response
    axios.put.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    // Edit tank
    const tank = screen.getByText('A1').closest('[role="button"]');
    await user.click(tank);

    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', { name: /save/i });
    
    // Click save
    await user.click(saveButton);

    // Should show loading indicator
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('handles invalid tank size changes', async () => {
    const user = userEvent.setup();
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    // Click large tank
    const largeTank = screen.getByText('A2-A3').closest('[role="button"]');
    await user.click(largeTank);

    // Try to change to regular size
    const dialog = await screen.findByRole('dialog');
    const sizeSelect = within(dialog).getByLabelText(/tank size/i);
    await user.click(sizeSelect);
    await user.click(screen.getByText(/regular/i));

    // Should show validation error
    expect(screen.getByText(/cannot change size/i)).toBeInTheDocument();
  });

  test('preserves tank state during drag operations', async () => {
    const onTankMove = jest.fn();
    render(<RackGrid rack={mockRack} onTankMove={onTankMove} />, { wrapper: TestWrapper });

    const tank = screen.getByText('A1').closest('[role="button"]');
    const dropZone = screen.getByTestId('grid-cell-B1');

    fireEvent.dragStart(tank, {
      dataTransfer: {
        setData: () => {},
        effectAllowed: 'move'
      }
    });
    
    // Check state during drag
    expect(screen.getByText('MALE: 5')).toBeInTheDocument();
    expect(tank).toHaveStyle({ opacity: '0.6' });

    // Complete drag operation
    fireEvent.dragOver(dropZone, {
      dataTransfer: {
        dropEffect: 'move'
      }
    });
    fireEvent.drop(dropZone);
    fireEvent.dragEnd(tank);
  });

  test('handles large tank positions correctly', async () => {
    const user = userEvent.setup();
    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    // Click large tank
    const largeTank = screen.getByText('A2-A3').closest('[role="button"]');
    await user.click(largeTank);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/A2-A3/)).toBeInTheDocument();
    });
  });

  test('prevents dragging to occupied positions', async () => {
    const onTankMove = jest.fn();
    render(<RackGrid rack={mockRack} onTankMove={onTankMove} />, { wrapper: TestWrapper });

    const tank = screen.getByText('A1').closest('[role="button"]');
    const occupiedZone = screen.getByTestId('grid-cell-A2');

    await act(async () => {
      fireEvent.dragStart(tank, {
        dataTransfer: {
          setData: () => {},
          effectAllowed: 'move'
        }
      });
      
      fireEvent.dragOver(occupiedZone, {
        dataTransfer: {
          dropEffect: 'move'
        }
      });
      
      fireEvent.drop(occupiedZone);
      fireEvent.dragEnd(tank);
    });

    // Expect no move if cell is 'occupied'
    expect(onTankMove).not.toHaveBeenCalled();
  });

  test('handles API errors during tank update', async () => {
    const user = userEvent.setup();
    axios.put.mockRejectedValueOnce({
      response: { data: { message: 'Error updating tank' } }
    });

    render(<RackGrid rack={mockRack} />, { wrapper: TestWrapper });

    // Click tank to edit
    const tank = screen.getByText('A1').closest('[role="button"]');
    await user.click(tank);

    // Edit and save
    const dialog = await screen.findByRole('dialog');
    const saveButton = within(dialog).getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Error updating tank')).toBeInTheDocument();
    });
  });
});

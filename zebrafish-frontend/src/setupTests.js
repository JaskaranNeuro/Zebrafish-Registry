// In setupTests.js
// Ensure you have a document body or container that MUI can attach portals to.
import '@testing-library/jest-dom';

// Mock react-beautiful-dnd
jest.mock('react-beautiful-dnd', () => ({
  DragDropContext: ({ children, onDragEnd }) => children,
  Droppable: ({ children }) =>
    children(
      {
        innerRef: jest.fn(),
        droppableProps: {},
        placeholder: null
      },
      {}
    ),
  Draggable: ({ children }) =>
    children(
      {
        innerRef: jest.fn(),
        draggableProps: {},
        dragHandleProps: {}
      },
      {
        isDragging: false
      }
    )
}));

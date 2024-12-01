import { Provider } from 'react-redux';
import './App.scss';
import VisualEditor from './VisualEditor';
import { store } from './Redux/store';

function App() {
  return (
    <Provider store={store}>
      <VisualEditor />
    </Provider>
  );
}

export default App;

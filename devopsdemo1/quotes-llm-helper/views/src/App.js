import logo from './logo.svg';
import './App.css';
import AskLLM from './js/askllm';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
 /*   <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>*/
    <Router>

        <div className="main">
          <div className="main">      
            <Routes>
              <Route path='/' element={<AskLLM/>} />             
            </Routes>
          </div>
        </div>  
      </Router>
  );
}

//ReactDOM.render(<App />, document.getElementById('monapp'));


export default App;

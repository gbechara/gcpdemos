import logo from './logo.svg';
import './App.css';
import ListQuotes from './js/listquotes';
import InsertWriter from './js/insertwriter';
import AskLLM from './js/askllm';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';



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

 
        <div className="container-fluid">
          <div class="topnav" id="myTopnav">
                <NavLink to='/' class="active" size='0'>List Quotes</NavLink>
                <NavLink to='/insertwriter' size='0'>Insert Writer</NavLink>
                <NavLink to='/askllm' size='0'>Ask LLM</NavLink>                
                <a onClick={refresh}>Refresh </a> 
                <a onClick={logout}>Log out</a>
            </div>
            <div>       
              <Routes>
                <Route path='/insertwriter' element={<InsertWriter/>} />
                <Route path='/askllm' element={<AskLLM/>} />
                <Route path='/' element={<ListQuotes/>} />             
              </Routes>
          </div>
        </div>  
      </Router>
  );
}

function refresh() {
  window.location.reload();
}

function logout() {
  window.location.reload();
}


//ReactDOM.render(<App />, document.getElementById('monapp'));


export default App;

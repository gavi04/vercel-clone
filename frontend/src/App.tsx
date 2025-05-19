import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import LandingPage from './landing';
import Deploy from './deploy';
import UserProjects from './projects';


function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage/>}/>
        <Route path="/deploy" element={<Deploy/>}/>
        <Route path="/projects" element={<UserProjects/>}/>
          
      </Routes>
    </BrowserRouter>
  )
}

export default App;

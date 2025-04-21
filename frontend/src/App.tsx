import axios from 'axios';
import './App.css';
import LogViewer from './components/logViewer';
import { SetStateAction, useState } from 'react';

function App() {
  const [link, setLink] = useState("");
  const [projectId, setProjectId] = useState(""); // dynamically track deployed project

  const deploy = async () => {
    try {
      const response = await axios.post('http://localhost:9000/project', {
        gitUrl: link
      });
      const { projectSlug } = response.data.data;
      console.log("Project created:", projectSlug);
      setProjectId(projectSlug); // show logs for this project
    } catch (error) {
      console.error("Deployment error:", error);
    }
  };

  const onChange = (event: { target: { value: SetStateAction<string>; }; }) => {
    setLink(event.target.value);
  };

  return (
    <>
      <div className="p-4">
        <div className="mb-2">
          <input
            value={link}
            onChange={onChange}
            className="border p-2 rounded w-96"
            placeholder="Enter GitHub repo URL"
          />
        </div>
        <button
          onClick={deploy}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Deploy
        </button>

        <br /><br />

        {projectId && <LogViewer projectId={projectId} />}
      </div>
    </>
  );
}

export default App;

import { SetStateAction, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Loader2,
  Rocket,
  ExternalLink,
  LogOut,
  Github,
  AlertCircle,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import LogViewer from './components/logViewer'; // Import the LogViewer component

function Deploy() {
  const [link, setLink] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState("");
  const [deploymentStatus, setDeploymentStatus] = useState("");
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("token");
      navigate('/');
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const deploy = async () => {
    if (!link) {
      setError("Please enter a GitHub URL");
      return;
    }

    if (!link.includes('github.com')) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    setError("");
    setIsDeploying(true);
    setDeploymentStatus("Initializing deployment process...");

    try {
      const token = localStorage.getItem("token");

      const deploymentStages = [
        "Cloning repository...",
        "Installing dependencies...",
        "Building project...",
        "Configuring deployment..."
      ];

      for (const stage of deploymentStages) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setDeploymentStatus(stage);
      }

      const response = await axios.post(
        "http://localhost:9000/project",
        { gitUrl: link },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      const { projectSlug } = response.data.data;
      setProjectId(projectSlug);
      setDeploymentStatus("Deployment successful!");
    } catch (error) {
      console.error("Deployment error:", error);
      setError("Failed to deploy project. Please check the URL and try again.");
      setDeploymentStatus("");
    } finally {
      setIsDeploying(false);
    }
  };

  const onChange = (e: { target: { value: SetStateAction<string> } }) => {
    setLink(e.target.value);
    setError(""); // Clear error when user types
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Rocket className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Deploy Hub</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => { navigate('/projects') }}
                className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                <FolderOpen className="h-5 w-5 mr-1" />
                My Projects
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Deploy Your Project</h1>

              {/* Form */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="github-url" className="block text-sm font-medium text-gray-700 mb-1">
                    GitHub Repository URL
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Github className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="github-url"
                      value={link}
                      onChange={onChange}
                      className={`block w-full pl-10 pr-12 py-3 border ${error ? 'border-red-300' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="https://github.com/username/repository"
                    />
                  </div>
                  {error && (
                    <div className="mt-2 flex items-center text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {error}
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <button
                    onClick={deploy}
                    disabled={isDeploying}
                    className="flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-5 w-5 mr-2" />
                        Deploy Project
                      </>
                    )}
                  </button>

                  {link && !isDeploying && (
                    <button
                      onClick={() => setLink("")}
                      className="ml-3 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {deploymentStatus && (
                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {isDeploying ? (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : (
                        <Rocket className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Deployment Status</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        {deploymentStatus}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {projectId && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Deployment Logs</h2>
                  <a
                    href={`http://${projectId}.localhost:8000`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    View Project
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>

                <div className="mb-4 flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-600">
                    Deployed • Project ID: <span className="font-mono text-gray-800">{projectId}</span>
                  </span>
                </div>

                <LogViewer projectId={projectId} />

                <div className="mt-4 flex justify-end">
                  <button
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    onClick={() => navigate(`/projects/${projectId}`)}
                  >
                    Go to project details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Deploy;

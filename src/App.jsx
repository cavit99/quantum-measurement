import Simulator from './components/Simulator';

function App() {
  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Quantum Measurement Simulator
        </h1>
        <Simulator />
      </div>
    </div>
  );
}

export default App;
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Droplet, Maximize2, Download, Upload, Brush, Eraser, Shuffle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const generateEmptyGrid = (rows, cols) => Array(rows).fill().map(() => Array(cols).fill(0));

const patterns = {
  glider: [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  blinker: [[0, 1], [1, 1], [2, 1]],
  toad: [[1, 1], [1, 2], [1, 3], [2, 0], [2, 1], [2, 2]],
};

const simulationModes = {
  conway: (neighbors, cell) => neighbors === 3 || (cell === 1 && neighbors === 2),
  highlife: (neighbors, cell) => neighbors === 3 || (cell === 1 && neighbors === 2) || (cell === 0 && neighbors === 6),
  dayAndNight: (neighbors, cell) => [3, 6, 7, 8].includes(neighbors) || (cell === 1 && [3, 4, 6, 7, 8].includes(neighbors)),
};

const Cell = memo(({ isAlive, onClick }) => (
  <div
    onMouseDown={onClick}
    onMouseEnter={(e) => e.buttons === 1 && onClick()}
    style={{ 
      backgroundColor: isAlive ? '#FF69B4' : '#E5E7EB', 
      width: '20px', 
      height: '20px', 
      border: '1px solid #ccc' 
    }}
  />
));

const GameOfLife = () => {
  const [numRows, setNumRows] = useState(50);
  const [numCols, setNumCols] = useState(50);
  const [grid, setGrid] = useState(() => generateEmptyGrid(numRows, numCols));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [generations, setGenerations] = useState(0);
  const [cellColor, setCellColor] = useState('#FF69B4');
  const [zoom, setZoom] = useState(1);
  const [brushSize, setBrushSize] = useState(1);
  const [isEraser, setIsEraser] = useState(false);
  const [simulationMode, setSimulationMode] = useState('conway');
  const [population, setPopulation] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const gridRef = useRef(grid);

  runningRef.current = running;
  speedRef.current = speed;
  gridRef.current = grid;

  const operations = [
    [0, 1], [0, -1], [1, -1], [-1, 1],
    [1, 1], [-1, -1], [1, 0], [-1, 0]
  ];

  const runSimulation = useCallback(() => {
    if (!runningRef.current) return;

    setGrid((g) => {
      const newGrid = g.map((arr) => [...arr]);
      let newPopulation = 0;

      for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
          let neighbors = 0;
          operations.forEach(([x, y]) => {
            const newI = (i + x + numRows) % numRows;
            const newJ = (j + y + numCols) % numCols;
            neighbors += g[newI][newJ];
          });

          newGrid[i][j] = simulationModes[simulationMode](neighbors, g[i][j]) ? 1 : 0;
          newPopulation += newGrid[i][j];
        }
      }

      setPopulation(pop => [...pop.slice(-99), newPopulation]);
      return newGrid;
    });

    setGenerations(gen => gen + 1);

    setTimeout(runSimulation, speedRef.current);
  }, [numRows, numCols, simulationMode]);

  useEffect(() => {
    if (running) {
      runSimulation();
    }
  }, [running, runSimulation]);

  const handleCellClick = (i, j) => {
    const newGrid = [...gridRef.current];
    for (let x = -Math.floor(brushSize/2); x <= Math.floor(brushSize/2); x++) {
      for (let y = -Math.floor(brushSize/2); y <= Math.floor(brushSize/2); y++) {
        const newI = (i + x + numRows) % numRows;
        const newJ = (j + y + numCols) % numCols;
        newGrid[newI][newJ] = isEraser ? 0 : 1;
      }
    }
    setGrid(newGrid);
  };

  const handlePatternSelect = (pattern) => {
    const newGrid = generateEmptyGrid(numRows, numCols);
    patterns[pattern].forEach(([x, y]) => {
      const centerX = Math.floor(numRows / 2);
      const centerY = Math.floor(numCols / 2);
      newGrid[centerX + x][centerY + y] = 1;
    });
    setGrid(newGrid);
    setGenerations(0);
    setPopulation([]);
  };

  const handleReset = () => {
    setGrid(generateEmptyGrid(numRows, numCols));
    setGenerations(0);
    setRunning(false);
    setPopulation([]);
  };

  const handleSizeChange = (rowChange, colChange) => {
    const newRows = Math.max(10, Math.min(100, numRows + rowChange));
    const newCols = Math.max(10, Math.min(100, numCols + colChange));
    setNumRows(newRows);
    setNumCols(newCols);
    setGrid(generateEmptyGrid(newRows, newCols));
    setGenerations(0);
    setPopulation([]);
  };

  const handleSave = () => {
    const data = JSON.stringify({grid, generations, numRows, numCols});
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'game-of-life-config.json';
    a.click();
  };

  const handleLoad = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = JSON.parse(e.target.result);
        setGrid(content.grid);
        setGenerations(content.generations);
        setNumRows(content.numRows);
        setNumCols(content.numCols);
      };
      reader.readAsText(file);
    }
  };

  const handleRandomize = () => {
    const newGrid = generateEmptyGrid(numRows, numCols);
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        newGrid[i][j] = Math.random() > 0.7 ? 1 : 0;
      }
    }
    setGrid(newGrid);
    setGenerations(0);
    setPopulation([]);
  };

  return (
    <div className={`flex flex-col items-center bg-gray-100 p-4 rounded-lg shadow-md ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto' : ''}`}>
      <h2 className="text-2xl font-bold mb-4">Game of Life Laboratory</h2>
      
      <div 
        className="relative overflow-auto mb-4 bg-white" 
        style={{
          display: 'grid', 
          gridTemplateColumns: `repeat(${numCols}, 20px)`, 
          gridTemplateRows: `repeat(${numRows}, 20px)`, 
          gap: '1px', 
          width: `${numCols * 20}px`, 
          height: `${numRows * 20}px`, 
          maxWidth: '100vw', 
          maxHeight: '60vh', 
          border: '1px solid #ccc'
        }}
      >
        {grid.map((rows, i) =>
          rows.map((col, k) => (
            <Cell
              key={`${i}-${k}`}
              isAlive={grid[i][k]}
              onClick={() => handleCellClick(i, k)}
            />
          ))
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <button
          className="flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            setRunning(!running);
            if (!running) {
              runningRef.current = true;
              runSimulation();
            }
          }}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          <span className="ml-1">{running ? 'Pause' : 'Start'}</span>
        </button>
        <button
          className="flex items-center px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={handleReset}
        >
          <RotateCcw size={16} />
          <span className="ml-1">Reset</span>
        </button>
        <select 
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          onChange={(e) => handlePatternSelect(e.target.value)}
        >
          <option value="">Select Pattern</option>
          <option value="glider">Glider</option>
          <option value="blinker">Blinker</option>
          <option value="toad">Toad</option>
        </select>
        <div className="flex items-center">
          <button
            className="px-2 py-1 bg-purple-500 text-white rounded-l hover:bg-purple-600"
            onClick={() => handleSizeChange(-5, -5)}
          >
            <Minus size={16} />
          </button>
          <span className="px-2 bg-white text-black">
            {numRows}x{numCols}
          </span>
          <button
            className="px-2 py-1 bg-purple-500 text-white rounded-r hover:bg-purple-600"
            onClick={() => handleSizeChange(5, 5)}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex items-center">
          <span className="mr-2">Speed:</span>
          <input
            type="range"
            min="50"
            max="1000"
            value={1050 - speed}
            onChange={(e) => setSpeed(1050 - e.target.value)}
            className="w-24"
          />
        </div>
        <div className="flex items-center">
          <Droplet size={16} className="mr-1" />
          <input
            type="color"
            value={cellColor}
            onChange={(e) => setCellColor(e.target.value)}
            className="w-8 h-8 p-0 border-0"
          />
        </div>
        <select 
          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          value={simulationMode}
          onChange={(e) => setSimulationMode(e.target.value)}
        >
          <option value="conway">Conway</option>
          <option value="highlife">HighLife</option>
          <option value="dayAndNight">Day & Night</option>
        </select>
        <div className="flex items-center">
          <span className="mr-2">Zoom:</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24"
          />
        </div>
        <div className="flex items-center">
          <span className="mr-2">Brush:</span>
          <input
            type="range"
            min="1"
            max="5"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-24"
          />
        </div>
        <button
          className={`flex items-center px-3 py-1 ${isEraser ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white rounded`}
          onClick={() => setIsEraser(!isEraser)}
        >
          {isEraser ? <Eraser size={16} /> : <Brush size={16} />}
          <span className="ml-1">{isEraser ? 'Eraser' : 'Brush'}</span>
        </button>
        <button
          className="flex items-center px-3 py-1 bg-pink-500 text-white rounded hover:bg-pink-600"
          onClick={handleRandomize}
        >
          <Shuffle size={16} />
          <span className="ml-1">Randomize</span>
        </button>
        <button
          className="flex items-center px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600"
          onClick={handleSave}
        >
          <Download size={16} />
          <span className="ml-1">Save</span>
        </button>
        <label className="flex items-center px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 cursor-pointer">
          <Upload size={16} />
          <span className="ml-1">Load</span>
          <input type="file" className="hidden" onChange={handleLoad} accept=".json" />
        </label>
        <button
          className="flex items-center px-3 py-1 bg-cyan-500 text-white rounded hover:bg-cyan-600"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          <Maximize2 size={16} />
          <span className="ml-1">Fullscreen</span>
        </button>
      </div>
      
      <div className="text-lg font-semibold mb-4">
        Generation: {generations} | Population: {population[population.length - 1] || 0}
      </div>

      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={population.map((pop, index) => ({ generation: generations - population.length + index + 1, population: pop }))}>
            <XAxis dataKey="generation" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="population" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Conway's Game of Life is a cellular automaton devised by mathematician John Conway.</p>
        <p>Rules: </p>
        <ul className="list-disc list-inside">
          <li>Any live cell with fewer than two live neighbours dies (underpopulation)</li>
          <li>Any live cell with two or three live neighbours lives on to the next generation</li>
          <li>Any live cell with more than three live neighbours dies (overpopulation)</li>
          <li>Any dead cell with exactly three live neighbours becomes a live cell (reproduction)</li>
        </ul>
        <p className="mt-2">Experiment with different patterns, speeds, and grid sizes to see how populations evolve!</p>
      </div>
    </div>
  );
};

export default GameOfLife;

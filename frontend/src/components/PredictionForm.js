import { useState } from "react";
import { getPrediction } from "../api/mlApi";

export default function PredictionForm() {
  const [features, setFeatures] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    const parsed = features.split(",").map(Number);
    const res = await getPrediction(parsed);
    setResult(res.predictions);
  };

  return (
    <div>
      <input value={features} onChange={e => setFeatures(e.target.value)} />
      <button onClick={handleSubmit}>Infer</button>
      {result && <div>Result: {result}</div>}
    </div>
  );
}

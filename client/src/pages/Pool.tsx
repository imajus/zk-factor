import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";

export default function Pool() {
  const { isConnected } = useWallet();
  const [createPoolOpen, setCreatePoolOpen] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [newPoolTargetAleo, setNewPoolTargetAleo] = useState("");
  const [newPoolMinContrib, setNewPoolMinContrib] = useState("5");

  const handleCreatePool = () => {
    // Logic to create a pool without requiring an invoice hash
    console.log("Creating pool:", {
      name: newPoolName,
      targetAleo: newPoolTargetAleo,
      minContrib: newPoolMinContrib,
    });
  };

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Pool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Pool Name"
              value={newPoolName}
              onChange={(e) => setNewPoolName(e.target.value)}
              className="input"
            />
            <input
              type="text"
              placeholder="Target Aleo"
              value={newPoolTargetAleo}
              onChange={(e) => setNewPoolTargetAleo(e.target.value)}
              className="input"
            />
            <input
              type="number"
              placeholder="Minimum Contribution"
              value={newPoolMinContrib}
              onChange={(e) => setNewPoolMinContrib(e.target.value)}
              className="input"
            />
            <Button onClick={handleCreatePool} disabled={!isConnected}>
              Create Pool
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

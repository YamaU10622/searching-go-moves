import express from 'express';
import fs from 'fs';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());
app.use(helmet(
  {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://searching-go-moves.onrender.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "https://searching-go-moves.onrender.com"],
      }
    },
  }
));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'top.html'));
});

app.post('/send-input-sgf', (req, res) => {
  const targetsgf = req.body.targetsgf;
  const sourcejson = fs.readFileSync("./data/test_sgf.json", 'utf-8');
  const sourcedata = JSON.parse(sourcejson);
  var sourcesgf = sourcedata[0].sgf;
  var isFound = searchMatchingSgf(sourcesgf,targetsgf);
  
  if(isFound){
    const id = generateId(sourcesgf);
    var matching_sgf_data = {"isFound": true,"id": id, "matching-sgf": sourcesgf};
    fs.writeFileSync("./data/matching_sgf.json", JSON.stringify(matching_sgf_data)); 
    var response = matching_sgf_data;
    res.json(response);
  } else {
    res.json({ "isFound": false });
  }
});

app.get('/get-matching-sgf', (req,res) => {
  const id = req.query.id;
  const matching_sgf_json = fs.readFileSync("./data/matching_sgf.json", 'utf-8');
  const matching_sgf_data = JSON.parse(matching_sgf_json);
  const matching_sgf = matching_sgf_data["matching-sgf"];
  res.json(matching_sgf);
});


function searchMatchingSgf(source, target) {
  const sgfMoves = source.split(";").filter(move => /^[BW]\[[a-z]+\]$/.test(move));
  const targetMoves = target.replace(/[()]/g, "").split(";").filter(move => /^[BW]\[[a-z]+\]$/.test(move));

  // ターゲットが順序通りに含まれているかをチェック
  let targetIndex = 0;
  for (const move of sgfMoves) {
      if (move === targetMoves[targetIndex]) {
          targetIndex++;
          if (targetIndex === targetMoves.length) {
            console.log("該当するSGFが見つかりました");
            return true; 
          }
      }
  }
  if (targetIndex < targetMoves.length) {
      console.log("該当するSGFが見つかりませんでした");
      return false; 
  }
}

function generateId(data) {
    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16); // 16文字に短縮
}

app.listen(port, () => {
  console.log(`Server is running at https://searching-go-moves.onrender.com:${port}`);
});
var updateCaptures = function (node) {
  document.getElementById('black-captures').innerText = node.info.captures[JGO.BLACK];
  document.getElementById('white-captures').innerText = node.info.captures[JGO.WHITE];
};
var jrecord = new JGO.Record(19);
var jboard = jrecord.jboard;
var jsetup = new JGO.Setup(jboard, JGO.BOARD.largeWalnut);
var player = JGO.BLACK; 
var ko = false, lastMove = false; 
var lastHover = false, lastX = -1, lastY = -1; 

document.getElementById('show-sgf-btn').addEventListener('click', async () => {
  const targetsgf = exportToSGF(jrecord);
  const data = {targetsgf : targetsgf};
  
  try {
    const response = await fetch('https://searching-go-moves.onrender.com/send-input-sgf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    });
    const responseData = await response.json();
    if (responseData.isFound) {
      var viewerlink = document.createElement('a');
      viewerlink.href = "../public/viewer.html?id=" + responseData.id;
      viewerlink.target = "_blank";
      viewerlink.textContent = "棋譜のviewerを表示";
      document.getElementById("searching-results").appendChild(viewerlink);
    }
  } catch (error) {
  console.error('Error:', error);
  }}); 

var exportToSGF = function(record) {
  var sgf = "(;FF[4]GM[1]SZ[" + record.jboard.width + "]"; // 初期設定(碁盤の大きさの情報追加)
  var node = record.root;
  
  while (node) {
    if (node.info && node.info.lastMove) {  // lastMoveプロパティをチェック
      sgf += ";";
      var coord = node.info.lastMove;
      var color = node.info.lastPlayer == JGO.BLACK ? "B" : "W";
      sgf += color + "[" + String.fromCharCode(97 + coord.i) + String.fromCharCode(97 + coord.j) + "]";
    }
    node = node.children[0];
  }
  sgf += ")";
  return sgf;
};

jsetup.setOptions({stars: {points:5}});
jsetup.create('input-board', function(canvas) {
  canvas.addListener('click', function(coord, ev) {
    var opponent = (player == JGO.BLACK) ? JGO.WHITE : JGO.BLACK;

    if(ev.shiftKey) { // on shift do edit
      if(jboard.getMark(coord) == JGO.MARK.NONE)
        jboard.setMark(coord, JGO.MARK.SELECTED);
      else
        jboard.setMark(coord, JGO.MARK.NONE);

      return;
    }


    if(lastHover)
      jboard.setType(new JGO.Coordinate(lastX, lastY), JGO.CLEAR);

    lastHover = false;

    var play = jboard.playMove(coord, player, ko);

    if(play.success) {
      node = jrecord.createNode(true);
      node.info.captures[player] += play.captures.length;
      
      node.info.lastMove = coord;
      node.info.lastPlayer = player;

      node.setType(coord, player);
      node.setType(play.captures, JGO.CLEAR);
      if(lastMove)
        node.setMark(lastMove, JGO.MARK.NONE);
      if(ko)
        node.setMark(ko, JGO.MARK.NONE);
      node.setMark(coord, JGO.MARK.CIRCLE);
      lastMove = coord;
      
      if(play.ko)
        node.setMark(play.ko, JGO.MARK.CIRCLE);
      ko = play.ko;
      
      player = opponent;
      updateCaptures(node);
    } else alert('Illegal move: ' + play.errorMsg);
  });

  canvas.addListener('mousemove', function(coord, ev) {
    if(coord.i == -1 || coord.j == -1 || (coord.i == lastX && coord.j == lastY))
      return;
    if(lastHover)
      jboard.setType(new JGO.Coordinate(lastX, lastY), JGO.CLEAR);
    
    lastX = coord.i;
    lastY = coord.j;
    
    if(jboard.getType(coord) == JGO.CLEAR && jboard.getMark(coord) == JGO.MARK.NONE) {
      jboard.setType(coord, player == JGO.WHITE ? JGO.DIM_WHITE : JGO.DIM_BLACK);
      lastHover = true;
    } else
      lastHover = false;
  });

  canvas.addListener('mouseout', function(ev) {
    if(lastHover)
      jboard.setType(new JGO.Coordinate(lastX, lastY), JGO.CLEAR);
    
    lastHover = false;
  });
});
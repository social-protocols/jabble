
async function setPositions(userID, positions) {

  console.log("Set positions", userID)
  if (!userID) {
    console.log("No user ID")
    return
  }

  var elements = document.getElementsByClassName("vote-form")
  console.log("Elements", elements)
  for (var i = 0; i < elements.length; i++) {
    console.log("Vote form", elements[i])
    elements[i].classList.add("ready")
  }

  for (var i = 0; i < positions.length; i++) {
    var postID = positions[i][0]
    var direction = positions[i][1]
    
    if (direction == 0) {
      continue;
    }

    setPosition(postID, direction);
  }
}

function setPosition(postID, direction) {
  console.log("Setting position", postID, direction)
  // var element = document.getElementById("post-" + postID)
  var selector = '[data-postid="' + postID + '"]';
  var posts = document.querySelectorAll(selector);

  posts.forEach((post) => {
    console.log("Post",post);
    if (direction == 1) {
      post.classList.add("upvoted", "voted");
      post.classList.remove("downvoted");
    } else if (direction == -1) {
      post.classList.add("downvoted", "voted");
      post.classList.remove("upvoted");
    } else if (direction == 0) {
      post.classList.remove("upvoted", "downvoted", "voted");
    }

    var hiddenInput = post.querySelector(".vote-buttons input[name='state']");
    if (hiddenInput != null) {
        hiddenInput.value = directionString(direction);
    } 

  })
}

function directionString(direction) {
  var result;
  switch (direction) {
    case 1:  result = "Up"; break;
    case -1: result = "Down"; break;
    case 0:  result = "Neutral";
  } 
  return result;
}

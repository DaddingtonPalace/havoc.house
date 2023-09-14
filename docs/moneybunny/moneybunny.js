var libraries = [];
var items = [];
var unseen = []; // indices into items
var seen = []; // indices into items
var current_item_position = null;

var header = document.getElementById("header");
var main = document.getElementById("main");
var primary = document.getElementById("primary");
var secondary = document.getElementById("secondary");
var progress = document.getElementById("progress");

window.onhashchange = function () {
	handleHashChange();
};

document.addEventListener('keydown', function (event) {
//	 advancePosition();
});

header.addEventListener('click', function (event) {
	handleHeaderClick(event);
});

main.addEventListener('click', function (event) {
	advancePosition();
});

function resetState() {
	items = [];
	unseen = [];
	seen = [];
	current_item_position = null;
}

function resetCardDisplay() {
	main.classList.remove("flipped");
	main.classList.remove("ended");
}

function resetProgressDisplay() {
	progress.innerHTML = "";
}

function setLibraryList(new_libraries) {
	resetState();
	libraries = new_libraries;
	onLibrariesChanged();
}

function onLibrariesChanged() {
	for (let i = 0; i < libraries.length; i++) {
		var node = document.createElement("div");
		node.id = i;
		node.innerText = libraries[i];
		node.classList.add("library_item");
		header.appendChild(node);
	}
}

function handleHashChange() {
	var frag = location.hash;
	var next_item_position = Number(frag.substring(1, frag.length));
	displayLibraryItem(next_item_position);
}

function handleHeaderClick(event) {
	if (!event.target.classList.contains("library_item")) {
		return; // not a library item.
	}
	const library_id = event.target.id;
	if (libraries[library_id] != null) {
		loadLibrary(library_id);
	} else {
		alert("Invalid library id: " + library_id);
	}
}

function loadLibrary(index) {

	const url = "https://havoc.house/moneybunny/conejitos/" + libraries[index] + ".json";
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.send();
	xhr.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			// can do som validation here.
			var json = JSON.parse(this.responseText);
			initializeLibrary(json);
		}
	}
}

function initializeLibrary(json) {
	resetState();
	items = json;
	unseen = Array.from({length: items.length}, (_, index) => index);
	layoutProgress();
	if (items.length > 0) {
		loadNextEntry();
	} else {
		alert("Failed to load items from library.");
	}
}

function getNextUnseenIndex() {
	const unseen_pos = Math.floor(Math.random() * (unseen.length - 1));
	return unseen[unseen_pos];
}

function loadNextEntry() {
	if (!hasMoreItems()) {
		console.log("Ignoring request to load next item. No unseen items.");
		showEndCard();
		return;
	}
	var next_position = getNextUnseenIndex();
	if (next_position < 0) {
		console.error("Trying to navigate to invalid position: " + next_position);
	} else {
		location.hash = next_position;
	}
}

function showEndCard() {
	resetCardDisplay();
	main.classList.add("ended");
}

function displayLibraryItem(next_item_position) {
	if (!Number.isInteger(next_item_position)) {
		alert("Can't load item for non-numeric index: " + next_item_position);
		return;
	}
	console.log("Displaying item at offset: " + next_item_position);

	resetCardDisplay();

	if (unseen.indexOf(next_item_position) == -1) {
		alert("New item index " + next_item_position + " is not present in unseen=[" + unseen + "]");
		return;
	}
	if (seen.indexOf(next_item_position) != -1) {
		alert("New item index " + next_item_position + " is already present in seen=[" + seen + "]");
		return;
	}
	current_item_position = next_item_position;
	unseen.splice(unseen.indexOf(current_item_position), 1);
	if (unseen.indexOf(current_item_position) != -1) {
		alert("Didn't get removed.");
	}

	seen.push(current_item_position);

	// update the HTML display
	primary.innerText = items[current_item_position].value;
	// don't load secondary text up front, otherwise it'll be
	// shown briefly as the element is only hidden after
	// a CSS transition (to 0 opacity) is completed
	secondary.innerText = "";
	updateProgress(current_item_position);
}

function hasMoreItems() {
	return unseen.length > 0;
}

function advancePosition() {
	if (main.classList.contains("flipped")) {
		loadNextEntry();
	} else {
		revealSecondary();
	}
}

function revealSecondary() {
	secondary.innerText = items[current_item_position].description;
	main.classList.add('flipped');
}

function layoutProgress() {
	resetProgressDisplay();
	for (let i = 0; i < items.length; i++) {
		var node = document.createElement("div");
		node.id = i;
		node.classList.add("item");
		progress.appendChild(node);
	}
}

function updateProgress(index) {
	progress.children[index].classList.add("seen");
}

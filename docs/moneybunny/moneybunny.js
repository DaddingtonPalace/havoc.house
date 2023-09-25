class Library {
	constructor(/** array */ items) {
		// List of item json entris {value: <text>, description: <text>}
		this.items = items;

		// list of position that have yet to be seen
		this.unseen = Array.from({length: items.length}, (_, index) => index);

		// list of position that have already been seen
		this.seen = [];

		// position of item being displayed
		this.current_item_position = null;
	}

	isValidPosition(position) {
		return Number.isInteger(position) && position >= 0 && position < this.items.length;
	}

	hasUnseenItems() {
		return this.unseen.length > 0;
	}

	getCurrentItemPosition() {
		return this.current_item_position;
	}

	/**
	 * Returns a random unseen item position, or -1 if no unseen items exist.
	 * Does not immediately mark it as seen.
	 */
	getRandomUnseenPosition() {
		if (!this.hasUnseenItems()) {
			return -1;
		}

		const unseen_pos = Math.floor(Math.random() * this.unseen.length);
		return this.unseen[unseen_pos];
	}

	setCurrentPosition(position) {
		this.current_item_position = position;
		this.markAsSeen(position);
	}

	getCurrentItem() {
		return this.items[this.current_item_position];
	}

	/**
	 * Move an item from unseen to seen lists.
	 * @param {*} position item position in library
	 */
	markAsSeen(position) {
		if (this.unseen.indexOf(position) == -1) {
			alert("New item index " + position + " is not present in unseen=[" + this.unseen + "]");
			return;
		}
		if (this.seen.indexOf(position) != -1) {
			alert("New item index " + position + " is already present in seen=[" + this.seen + "]");
			return;
		}
		// record the fact that the item is shown
		this.unseen.splice(this.unseen.indexOf(position), 1);
		if (this.unseen.indexOf(position) != -1) {
			alert("Didn't get removed.");
		}

		this.seen.push(position);
	}

	size() {
		return this.items.length;
	}
}

class LibraryProvider {
	constructor(/** array */ library_sources) {
		this.sources = library_sources;
	}

	loadLibrary(src_id, callback) {
		if (this.sources[src_id] == null) {
			console.error("Cannot load library. Invalid library source id: " + src_id);
			return;
		}

		const url = this.sources[src_id].src;
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.send();
		xhr.onreadystatechange = function () {
			if (this.readyState == 4 && this.status == 200) {
				// can do som validation here.
				var json = JSON.parse(this.responseText);
				callback(new Library(json));
			}
		}
	}
}

class ProgressDisplay {
	constructor(html_element, library) {
		this.element = html_element;
		this.library = library;
	}

	createLayout() {
		this.clearLayout();
		for (let i = 0; i < library.size(); i++) {
			var node = document.createElement("div");
			node.id = i;
			node.classList.add("item");
			this.element.appendChild(node);
		}
	}

	itemStarted(index) {
		this.element.children[index].classList.add("started");
	}
	
	itemCompleted(index) {
		this.element.children[index].classList.add("complete");
	}

	clearLayout() {
		this.element.innerHTML = "";
	}
}


var library_provider = null;
var library = null;
var progress = null;

var menu = document.getElementById("menu");
var menu_toggle = document.getElementById("menu_toggle");
var menu_items = document.getElementById("menu_items");
var main = document.getElementById("cardbox");
var prompt = document.getElementById("prompt");
var secret = document.getElementById("secret");

document.addEventListener('keydown', function (event) {
//	 advancePosition();
});

menu_toggle.addEventListener('click', function (event) {
	handleMenuToggleClick();
});

menu_items.addEventListener('click', function (event) {
	handleMenuItemClick(event);
});

cardbox.addEventListener('click', function (event) {
	advancePosition();
});

function onPromptTransitionEnd() {
	// nothing to do at this time.
}

function isSecretVisible() {
	return secret.classList.contains("revealed");
}

// this is a very fragile coupling. Gonna need to revist
// to ensure we're nice in racey situations.
// secret.addEventListener("transitionend", onSecretTransitionEnd);
// secret.addEventListener("transitioncancel", onSecretTransitionEnd);

/**
 * Sets up the library provider so that the application
 * can do stuff.
 * This is the main entry point from the HTML.
 */
function setLibraryList(library_sources) {
	library_provider = new LibraryProvider(library_sources);
	for (let i = 0; i < library_sources.length; i++) {
		var node = document.createElement("div");
		node.id = i;
		node.innerText = library_sources[i].name;
		node.classList.add("library_item");
		menu_items.appendChild(node);
	}
	resetCardDisplay();
	handleMenuToggleClick();
}

function resetCardDisplay() {
	cardbox.classList.remove("ended");
	prompt.classList.remove("dimmed");
	secret.classList.remove("revealed");
}

function revealSecret() {
	secret.innerText = library.getCurrentItem().description;
	secret.classList.add('revealed');
}

function handleMenuToggleClick() {
	if (menu.classList.contains("collapsed")) {
		menu.classList.remove("collapsed");
	} else {
		menu.classList.add("collapsed");
	}
}

function handleMenuItemClick(event) {
	if (event.target.classList.contains("library_item")) {
		const library_id = event.target.id;
		library_provider.loadLibrary(library_id, onLibraryLoaded);
		handleMenuToggleClick(); // hide it
	} else {
		console.debug("Ignoring click on non-menu-item.");
	}
}

function onLibraryLoaded(new_library) {
	library = new_library;
	progress = new ProgressDisplay(
		document.getElementById("progress"),
		library);
		progress.createLayout();
	if (!library.hasUnseenItems()) {
		console.error("Loaded library contains no unseen items.");
	}
	goToNextItem();
}

function goToNextItem() {
	if (!library) {
		return;
	}
	if (!library.hasUnseenItems()) {
		console.log("Ignoring request to load next item. No unseen items.");
		showEndCard();
		return;
	}

	var next_position = library.getRandomUnseenPosition();
	updatetItemDisplay(next_position);
}

// @position is item position in library
function updatetItemDisplay(position) {
	if (!library.isValidPosition(position)) {
		alert("Can't load item for non-numeric index: " + position);
		return;
	}

	const current_position = library.getCurrentItemPosition();
	if (current_position != null) {
		progress.itemCompleted(current_position);
	}
	library.setCurrentPosition(position);

	// immediatly update prompt text (which should be in dimmed state).
	prompt.innerText = library.getCurrentItem().value;

	// only after secret has been un-revealed can we
	// update the text.
	secret.addEventListener('animationend', updateSecretText);

	// here we kick off the change in display
	// state changing secret to hidden and 
	// changing the main prompt to full opacity.
	// this employs an animation necessitating
	// we listen to animationend.
	resetCardDisplay();
	progress.itemStarted(position);
}

function updateSecretText() {
	secret.innerText = library.getCurrentItem().description;
}

function showEndCard() {
	resetCardDisplay();
	progress.clearLayout();
	cardbox.classList.add("ended");
	handleMenuToggleClick();
}

function advancePosition() {
	if (isSecretVisible()) {
		goToNextItem();
	} else {
		revealSecret();
	}
}

class Library {
	constructor(/** array */ items) {
		// List of item json entris {value: <text>, description: <text>}
		this.items = items;

		// list of position that have yet to be seen
		this.unseen = Array.from({ length: items.length }, (_, index) => index);

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

class MenuDisplay {
	constructor(menu_element, toggle_element, items_element, item_click_callback) {
		this.menu = menu_element;
		this.toggle = toggle_element;
		this.items_container = items_element;
		this.callback = item_click_callback;

		// Not sure how to do js method callbacks that correctly
		// capture "this". For now we capture this as "self"
		// so we can call it from the event handler callbacks.
		var self = this;
		toggle_element.addEventListener('click', function (event) {
			self._handleToggleClick();
		});

		items_element.addEventListener('click', function (event) {
			self._handleItemClick(event);
		});
	}

	expandMenu() {
		this.menu.classList.remove("collapsed");
	}

	collapseMenu() {
		this.menu.classList.add("collapsed");
	}

	isExpanded() {
		return !this.menu.classList.contains("collapsed");
	}

	addMenuItem(id, name) {
		var node = document.createElement("div");
		node.id = id;
		node.innerText = name;
		node.classList.add("library_item");
		this.items_container.appendChild(node);
	}

	_handleToggleClick() {
		if (this.isExpanded()) {
			this.collapseMenu();
		} else {
			this.expandMenu();
		}
	}

	_handleItemClick(event) {
		if (event.target.classList.contains("library_item")) {
			this.callback(event.target.id);
		} else {
			console.debug("Ignoring click on non-menu-item.");
		}
		this.collapseMenu();
	}
}

var library_provider = null;
var library = null;
var menu = null;
var progress = null;

var main = document.getElementById("cardbox");
var prompt = document.getElementById("prompt");
var secret = document.getElementById("secret");

document.addEventListener('keydown', function (event) {
	//	 advancePosition();
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

/**
 * Sets up the library provider so that the application
 * can do stuff.
 * This is the main entry point from the HTML.
 */
function setLibraryList(library_sources) {
	library_provider = new LibraryProvider(library_sources);
	menu = new MenuDisplay(
		document.getElementById("menu"),
		document.getElementById("menu_toggle"),
		document.getElementById("menu_items"),
		onMenuClick);
	for (let i = 0; i < library_sources.length; i++) {
		menu.addMenuItem(i, library_sources[i].name);
	}
	resetCardDisplay();
	menu.expandMenu();
}

function onMenuClick(library_id) {
	library_provider.loadLibrary(library_id, onLibraryLoaded);
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

function resetCardDisplay() {
	cardbox.classList.remove("ended");
	prompt.classList.remove("dimmed");
	secret.classList.remove("revealed");
}

function revealSecret() {
	updateSecretText();
	secret.classList.add('revealed');
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

	// // only after secret has been un-revealed can we
	// // update the text.
	// secret.addEventListener('animationend', updateSecretText);

	// here we kick off the change in display
	// state changing secret to hidden and 
	// changing the main prompt to full opacity.
	// this employs an animation necessitating
	// we listen to animationend.
	resetCardDisplay();
	progress.itemStarted(position);
}

function escapeHtml(unsafe) {
	return unsafe
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function updateSecretText() {
	var unsafe = "";
	var desc = library.getCurrentItem().description;
	if (Array.isArray(desc)) {
		unsafe = desc.join(" / ");
	} else {
		unsafe = desc;
	}

	secret.innerText = escapeHtml(unsafe);
}

function showEndCard() {
	resetCardDisplay();
	progress.clearLayout();
	cardbox.classList.add("ended");
	menu.expandMenu();
}

function advancePosition() {
	if (isSecretVisible()) {
		goToNextItem();
	} else {
		revealSecret();
	}
}

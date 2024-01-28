document.addEventListener('DOMContentLoaded', function () {
	showSeeMoreLinks()
})

showSeeMoreLinks()

function showSeeMoreLinks() {
	var divs = document.querySelectorAll('.postteaser')
	console.log('divs', divs)

	for (var d of divs) {
		console.log('Div', d)
		var contentDiv = d.querySelector('.postcontent')
		var seeMoreLink = d.querySelector('.show-more')
		console.log(contentDiv, seeMoreLink)
		if (isTextOverflowing(contentDiv)) {
			seeMoreLink.style.display = 'block'
		}
	}
}

function isTextOverflowing(element) {
	return element.scrollHeight > element.clientHeight
}

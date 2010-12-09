var HipsterPDACard = new Class({
    card_tmpl: "<section class='card {colour}'><menu><a class='close'></a></menu><article contenteditable=true>{content}</article></section>",
    
    initialize: function (options) {
        options = Object.append({
            text: '',
            colour: 'white',
            coords: {"x": 0, "y": 0}
        }, options);
        this.colour = options.colour;
        this.text = options.text;
        this.coords = options.coords;
        this.el = null;
    },
    
    meta: function () {
        return {text: this.text, coords: this.coords, colour: this.colour};
    },
    
    get_content: function () {
        return this.text.replace(/\n/g, "<br>")
                               .replace(/(\s|^|>)(#\w*)(\b)/gi, "$1<span class=tag>$2</span>$3")
                               .replace(/&nbsp;/g, " ")
                               .replace(/(\s|^|>)(https?\:\/\/[^\s<>]+)/g, "$1<a href=$2>$2</a>");
    },
    
    create: function () {
        var card = this.card_tmpl.substitute({"colour": this.colour, "content": this.get_content()});
        this.el = Elements.from(card).pop();
        this.el.card = this;
        return this;
    },
    
    render: function (location) {
        location = location || $('board');
        this.create();
        this.el.inject(location);
        this.el.position(this.coords);
        return this;
    },
    
    update: function () {
        var $card = this.el ? this : this.getParent('section').card;
        if ($card.text != $card.el.innerText) {
            $card.text = $card.el.innerText;
            $card.el.getElement('article').innerHTML = $card.get_content();
        }
        $card.el.removeClass('editing');
        $card.my_drag.attach();
        HipsterPDA.save();
    },
    
    make_draggable: function () {
        this.my_drag = new Drag(this.el, {
            onStart: function (el) {
                el.addClass('drag');
                el.setStyle('z-index', HipsterPDA.zIndex++);
            },
            onComplete: function (el) {
                el.removeClass('drag');
                el.card.coords = el.getPosition();
                el.card.update();
            }
        });
    }
    
});


var HipsterPDA = new Class({
    zIndex: 2,
    colours: ['white', 'green', 'blue', 'red', 'orange', 'yellow'],
    storage_key: 'HipsterPDA',
    cards: [],
    
    initialize: function () {
        
        // Create the board
        var cards = localStorage.getItem(this.storage_key);
        cards = cards ? JSON.decode(cards) : [
            { text: "Welcome to Hipster PDA!\n\n * write your todos here!", coords: {}, colour: 'white'},
            { text: "", coords: {x: 10, y: 80}, colour: 'white'}
        ];
        var $this = this;
        cards.each(function (card) {
            var $card = new HipsterPDACard(card);
            $card.render();
            $card.make_draggable();
            $this.cards.push($card);
        });
        
        // Create the deck
        this.colours.each(function (colour, i) {
            var card = new HipsterPDACard({'colour': colour}).create();
            (function() {
                card.el.inject($('deck'))
                       .addClass(colour)
                       .setStyle('left', -500)
                       .setStyle('top', 50 + (i*50))
                       .tween('left', -500, 10);
            }).delay(i*100, this);        
        });
        
        this.handle_events();
    },
    
    handle_events: function () {
        document.addEvents({
            "dblclick:relay(#board article)": function () {
                /* double click to edit a card */
                var $card = this.el ? this : this.getParent('section').card;
                $card.el.fireEvent('mouseleave');
                $card.el.setStyle('z-index', HipsterPDA.zIndex++);
                $card.my_drag.detach();
                this.addClass('editing');
                this.focus();
            },
            "click:relay(#board article)": function () {
                /* clicking a card brings it to the front */
                var $card = this.el ? this : this.getParent('section').card;
                $card.el.setStyle('z-index', HipsterPDA.zIndex++);
            },
            "click:relay(#board)": function () {
                $$('article.editing').each(function(el){
                    var $card = el.getParent('section').card;
                    $card.update();
                });
            },
            "click:relay(menu .close)": function() {
                /* close a card */
                var $card = this.getParent('section').card;
                HipsterPDA.cards.pop($card);
                $card.el.destroy();
                HipsterPDA.save();
            },
            "click:relay(.tag)": function() {
                /* click a tag */
                var tag = this.innerText;
                $$('.tag:contains('+tag+')')
                    .getParent('section')
                    .each(function (el) {
                        if (el.hasClass('mark')) {
                            document.body.removeClass('mark');
                            el.removeClass('mark');
                            el.removeClass('drag');
                            el.getElement('.tag:contains('+tag+')').removeClass('mark');
                        } else {
                            document.body.addClass('mark');
                            el.addClass('mark');
                            el.addClass('drag');
                            el.getElement('.tag:contains('+tag+')').addClass('mark');
                        }
                    });
            },
            "mouseenter:relay(#deck section)": function () {
                /* hovering over the deck pushes a card out */
                $(this).set('tween', {duration: 50, transaction: 'bounce:relay(#board article)":out'})
                       .tween('left', 30);},
            "mouseleave:relay(#deck section)": function () {
                /* leaving the deck pushes a card in */
                $(this).tween('left', 10);
            },
            "mousedown:relay(#deck section)": function () {
                /* click on a deck card to add it to the board */
                var $card = this;
                var colour = HipsterPDA.colours.filter(function (col) {return $card.hasClass(col);})[0] || 'white';
                var position = $card.getPosition();
                (function() {
                    $card.setStyle('left', -500)
                         .show()
                        .tween('left', -500, 10);
                }).delay(1000, this);
                this.hide();
                var card = new HipsterPDACard({
                    colour: colour,
                    coords: position
                }).render($('board'));
                card.el.tween('left', 75);
                card.make_draggable();
                HipsterPDA.cards.push(card);
                HipsterPDA.save();
            }
        });
    },
    save: function () {
        var cards = [];
        this.cards.each(function (card) {
            cards.push(card.meta());
        });
        localStorage.setItem(this.storage_key, JSON.stringify(cards));
    }
});

window.addEvent('domready', function () {
    HipsterPDA = new HipsterPDA();
});
jQuery(document).ready(function($) {

    state = {
        navbarOpen: false,
    }
    
    $(window).bind('scroll', function() {
         if ($(window).scrollTop() > 50) {
             $('#header').addClass('top-navbar');
         }
         else {
             $('#header').removeClass('top-navbar');
         }
    });
   
    /* ======= ScrollTo ======= */
    $('a.scrollto').on('click', function(e){
        
        //store hash
        var target = this.hash;
                
        e.preventDefault();
        
		$('body').scrollTo(target, 800, {offset: -70, 'axis':'y', easing:'easeOutQuad'});
        //close mobile menu after clicking
		if ($('.navbar-close').hasClass('in')){
			$('.navbar-close').removeClass('in').addClass('close');
		}
		
	});

    $('.toggle-nav').on('click', function (e) {
        e.preventDefault();
        if (state.navbarOpen === true) {
            state.navbarOpen = false;
            $('.navbar-close').addClass('close')
        } else {
            state.navbarOpen = true;
            $('.navbar-close').removeClass('close')
        }
    })
    $('.navbar-nav').on('click', function (e) {
        if (state.navbarOpen) {
            state.navbarOpen = false;
            $('.navbar-close').addClass('close')
        }
        e.preventDefault();
    })
});
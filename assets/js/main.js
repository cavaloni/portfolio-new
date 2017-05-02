jQuery(document).ready(function($) {

    state = {
        navbarOpen: false,
    }
    
    var homeScroll = $('#informative').position().top - 71;
    var aboutScroll = $('#about').position().top - 71;
    var skillsScroll = $('#features').position().top - 71;
    var projectsScroll = $('#docs').position().top - 71;
    var whyChadScroll = $('#why-chad').position().top - 71;
    var contactScroll = $('#contact').position().top - 71;

    var idNames = ['#homeScroll', '#aboutScroll', '#skillsScroll', '#projectsScroll', '#whyChadScroll', '#contactScroll']
    function rmvActive(except) {
        idNames.forEach(function(name) {
            if (name === except) {
                return
            }
            $(name).removeClass('active')
        })
    }

    $(window).bind('scroll', function() {
         var pos = $(window).scrollTop();
         if (pos > 50) {
             $('#header').addClass('top-navbar');
         }
         else {
             $('#header').removeClass('top-navbar');
         }
         if (pos >= homeScroll && pos < aboutScroll) {
             $('#homeScroll').addClass('active')
             rmvActive('#homeScroll')
         }
         else if (pos >= aboutScroll && pos < skillsScroll) {
             $('#aboutScroll').addClass('active')
             rmvActive('#aboutScroll')
         } else if (pos >= skillsScroll && pos < projectsScroll) {
             $('#skillsScroll').addClass('active')
             rmvActive('#skillsScroll')
         } else if (pos >= projectsScroll && pos < whyChadScroll) {
             $('#projectsScroll').addClass('active')
             rmvActive('#projectsScroll')
         } else if (pos >= whyChadScroll && pos < contactScroll) {
             $('#whyChadScroll').addClass('active')
             rmvActive('#whyChadScroll')
         } else if (pos >= contactScroll) {
             $('#contactScroll').addClass('active')
             rmvActive('#contactScroll')
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
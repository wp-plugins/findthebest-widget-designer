<?php
/*
  Plugin Name: FindTheBest Widget Picker
  Plugin URI: http://findthebest.com
  Description: The FindTheBest plugin allows you to embed widgets from FindTheBest into your WordPress site's blog posts.
  Version: 1.0
  Author: Jonathan Desrosiers & the FindTheBest Team.
  Author URI: http://findthebest.com
  License: GPLv2
 */

if ( ! class_exists( 'FindTheBest_Widget_Picker' ) ) {
	class FindTheBest_Widget_Picker {

		function __construct() {
			add_action( 'admin_init', array( $this,'admin_init' ) );
			add_action( 'media_buttons', array( $this, 'media_buttons' ), 20 );

			add_action( 'admin_print_scripts-post.php', array( $this, 'admin_print_scripts') );
			add_action( 'admin_print_scripts-post-new.php', array( $this, 'admin_print_scripts') );

			add_action( 'admin_footer-post.php', array( $this, 'admin_footer' ) );
			add_action( 'admin_footer-post-new.php', array( $this, 'admin_footer' ) );

			add_shortcode( 'findthebest', array( $this, 'shortcode_handler' ) );
		}

		/**
		 * Load our scripts
		 */
		function admin_print_scripts() {
			wp_enqueue_script( 'ftb_widget_picker', 'http://web1.ftb-direct.com:8000/sites/all/modules/custom/widgets/WidgetDesigner.js' , array( 'jquery' ), '1.0', false );

			$ftb_options = wp_parse_args( get_option( 'ftb_plugin_settings' ), array( 'publisher_id' => '', 'amazon_id' => '' ) );
			wp_localize_script( 'ftb_widget_picker', 'ftb_widget_picker_vars',
				array(
					'api_url' => 'http://findthebest.com/api/',
					'publisher_id' => $ftb_options['publisher_id'],
					'amazon_id' => $ftb_options['amazon_id'],
				)
			);
		}

		/**
		 * Register our settings sections and fields.
		 */
		function admin_init() {
			register_setting( 'ftb_plugin_settings', 'ftb_plugin_settings', array( $this, 'sanitize_plugin_options' ) );

			//add a section for the plugin's settings to the writing page
			add_settings_section( 'ftb_settings_section', 'Find The Best Plugin Settings', array( $this, 'settings_section_text' ), 'writing' );
			add_settings_field( 'ftb_publisher_id_field', 'Publisher ID: ', array( $this,'make_publisher_id_settings_field' ), 'writing', 'ftb_settings_section' );
			add_settings_field( 'ftb_amazon_id_field', 'Amazon ID: ', array( $this,'make_amazon_id_settings_field' ), 'writing', 'ftb_settings_section' );
		}

		function settings_section_text() {
			echo "<p>The FTB plugin requires your publisher ID in order to function.</p>";
			settings_fields( 'ftb_plugin_settings' );
		}

		function make_publisher_id_settings_field() {
			$settings = get_option( 'ftb_plugin_settings' );

			$settings = wp_parse_args( $settings, array( 'publisher_id' => '' ) );
			?>
				<input id="ftb_publisher_id_field" type="text" value="<?php echo esc_attr( $settings['publisher_id'] ); ?>" name="ftb_plugin_settings[publisher_id]" />
			<?php
		}

		function make_amazon_id_settings_field() {
			$settings = get_option( 'ftb_plugin_settings' );

			$settings = wp_parse_args( $settings, array( 'amazon_id' => '' ) );
			?>
				<input id="ftb_amazon_id_field" type="text" value="<?php echo esc_attr( $settings['amazon_id'] ); ?>" name="ftb_plugin_settings[amazon_id]" />
			<?php
		}

		function sanitize_plugin_options( $input ) {
			$newinput = wp_parse_args( $input, array( 'publisher_id' => '', 'amazon_id' => '' ) );

			$newinput['publisher_id'] = sanitize_text_field( trim( $newinput['publisher_id'] ) );

			if( ! preg_match( '/^[a-z0-9]{0,32}$/i', $newinput['publisher_id'] ) )
				$newinput['publisher_id'] = '';

			$newinput['amazon_id'] = sanitize_text_field( trim( $newinput['amazon_id'] ) );

			return $newinput;
		}

		/**
		 * Output the insert FTB widget button
		 */
		function media_buttons() {
			global $hook_suffix;

			if ( $hook_suffix != 'edit.php' && $hook_suffix != 'post.php' && $hook_suffix != 'post-new.php' )
				return;
			?>

			<a href="#TB_inline?width=1100&height=600&inlineId=ftb_widget_picker_container" id="add_ftb_widget" class="thickbox" title="Insert FTB Widget"><img src="<?php echo plugins_url( 'images/', __FILE__ ); ?>ftb_wp_media_icon.png" alt="Insert FTB Widget" /></a>
			<?php
		}

		/**
		 * Output the widget picker
		 */
		function admin_footer() {
			?>
			<div id="ftb_widget_picker_container" style="display:none;">
				<div id="ftb_widget_picker">

				</div>
				<input type="button" id="ftb_insert_button" class="button button-primary button-large" value="Insert Into Post" onclick="ftb_send_to_editor();" />
			</div>

			<script>
				jQuery(document).ready(function(){
					FTB.WD.init('#ftb_widget_picker', {
						pub_id: ftb_widget_picker_vars.publisher_id,
						amazon_id: ftb_widget_picker_vars.amazon_id
					});
				});

				jQuery('#add_ftb_widget').click(function(){
					setTimeout(
						function ftb_resize_window() {
							jQuery('div#TB_window').addClass('ftb_window');
							jQuery('div#TB_ajaxContent').addClass('ftb_ajaxContent');
						},
						500
					)
				});

				function ftb_send_to_editor() {
					var ftb_embed_code = '<div>' + jQuery( '#ftb_widget_picker textarea.ftw-embed-code').val() + '</div>',

					ftb_shortcode = '[findthebest container_style="' + jQuery('div:first', ftb_embed_code).attr('style') + '" width="' + jQuery('iframe', ftb_embed_code).attr('width') + '" height="' + jQuery('iframe', ftb_embed_code).attr('height') + '" style="' + jQuery('iframe', ftb_embed_code).attr('style') + '" src="' + jQuery('iframe', ftb_embed_code).attr('src') + '" after_style="' + jQuery('div', ftb_embed_code).last().attr('style') + '" link_href="' + jQuery('a', ftb_embed_code).attr('href') + '" link_style="' + jQuery('a', ftb_embed_code).attr('style') + '" link_text="' + jQuery('a', ftb_embed_code).html() + '"]';
					window.send_to_editor( ftb_shortcode );
				}
			</script>
			<style>
				#TB_window.ftb_window { width: 1130px !important; margin-left: -570px !important; }
				#TB_ajaxContent.ftb_ajaxContent { width: 1100px !important; }
				#ftb_insert_button { position: absolute; bottom: 52px; left: 34px; }
			</style>
			<?php
		}

		/**
		 * Handle the [findthebest] shortcode
		 * Full example: [findthebest container_style="width:600px;margin:0 auto;" width="600" height="400" style="vertical-align:top;" src="http://work-at-home.findthebest.com/w/ss?new=2&w=600&h=400&initial_slide=1" after_style="text-align:center;" link_href="http://work-at-home.findthebest.com" link_style="font:10px/14px arial;color:#3d3d3d;" link_text="Compare Work at Home"]
		 *
		 */
		function shortcode_handler( $atts ) {
			//If the attributes are empty, there is no reason to continue
			if ( empty( $atts ) )
				return;

			//Take the attributes passed, and set empty parameters as default
			extract( wp_parse_args( $atts,
				array(
					'container_style' => '',
					'width' => 600,
					'height' => 400,
					'style' => '',
					'src' => '',
					'after_style' => '',
					'link_href' => '',
					'link_style' => '',
					'link_text' => '',
				)
			) );

			if ( empty( $src ) )
				return;

			$output = '<div';

			if ( ! empty( $container_style ) )
				$output .= ' style="' . esc_attr( $container_style ) . '"';

			$output .= '><iframe width=' . esc_attr( $width ) . ' height=' . esc_attr( $height ) . ' frameborder=0 scrolling="no" src="' . esc_url( $src ) . '"';

			if ( ! empty( $style ) )
				$output .= ' style="' . esc_attr( $style ) . '"';

			$output .= '></iframe>';

			if ( ! empty( $link_href ) && ! empty( $link_text ) ) {
				$output .= '<div';

				if ( ! empty( $after_style ) )
					$output .= ' style="' . esc_attr( $after_style ) . '"';

				$output .= '><a href="' . esc_url( $link_href ) . '"';

				if ( ! empty( $link_style ) )
					$output .= ' style="' . esc_attr( $link_style ) . '"';

					$output .= '>' . esc_html( $link_text ) . '</a></div>';
			}

			$output .= '</div>';

			return $output;
		}
	}

}

if ( class_exists( 'FindTheBest_Widget_Picker' ) )
	$findthebest_widget_picker = new FindTheBest_Widget_Picker();

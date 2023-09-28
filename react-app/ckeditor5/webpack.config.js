/**
 * @license Copyright (c) 2014-2023, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

'use strict';

/* eslint-env node */

const path = require( 'path' );
const webpack = require( 'webpack' );
const { bundler, styles } = require( '@ckeditor/ckeditor5-dev-utils' );
const { CKEditorTranslationsPlugin } = require( '@ckeditor/ckeditor5-dev-translations' );
const TerserWebpackPlugin = require( 'terser-webpack-plugin' );

module.exports = {
	devtool: 'source-map',
	performance: { hints: false },

	entry: path.resolve( __dirname, 'src', 'ckeditor.ts' ),

	output: {
		// The name under which the editor will be exported.
		library: 'ClassicEditor',

		path: path.resolve( __dirname, 'build' ),
		filename: 'ckeditor.js',
		libraryTarget: 'umd',
		libraryExport: 'default'
	},

	optimization: {
		minimizer: [
			new TerserWebpackPlugin( {
				sourceMap: true,
				terserOptions: {
					output: {
						// Preserve CKEditor 5 license comments.
						comments: /^!/
					}
				},
				extractComments: false
			} )
		]
	},

	plugins: [
		new CKEditorTranslationsPlugin( {
			// UI language. Language codes follow the https://en.wikipedia.org/wiki/ISO_639-1 format.
			// When changing the built-in language, remember to also change it in the editor's configuration (src/ckeditor.ts).
			language: 'en',
			additionalLanguages: 'all'
		} ),
		new webpack.BannerPlugin( {
			banner: bundler.getLicenseBanner(),
			raw: true
		} ),
		// change toolbar icons
		new webpack.NormalModuleReplacementPlugin(
			/link\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/link.svg'
		),
		new webpack.NormalModuleReplacementPlugin(
			/bold\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/bold.svg'
		),
		new webpack.NormalModuleReplacementPlugin(
			/italic\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/italic.svg'
		),
		new webpack.NormalModuleReplacementPlugin(
			/strikethrough\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/strikethrough.svg'
		),
		new webpack.NormalModuleReplacementPlugin(
			/numberedlist\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/numberedlist.svg'
		),
		new webpack.NormalModuleReplacementPlugin(
			/bulletedlist\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/bulletedlist.svg'
		),
		new webpack.NormalModuleReplacementPlugin(
			/quote\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/quote.svg'
		),
		new webpack.NormalModuleReplacementPlugin(
			/code\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/code.svg'
		),
		new webpack.NormalModuleReplacementPlugin(
			/codeblock\.svg/,
			'/home/zhangqy940421/aa-projects/klack/react-app/public/codeblock.svg'
		),
	],

	resolve: {
		extensions: [ '.ts', '.js', '.json' ]
	},

	module: {
		rules: [ {
			test: /\.svg$/,
			use: [ 'raw-loader' ]
		}, {
			test: /\.ts$/,
			use: 'ts-loader'
		}, {
			test: /\.css$/,
			use: [ {
				loader: 'style-loader',
				options: {
					injectType: 'singletonStyleTag',
					attributes: {
						'data-cke': true
					}
				}
			}, {
				loader: 'css-loader'
			}, {
				loader: 'postcss-loader',
				options: {
					postcssOptions: styles.getPostCssConfig( {
						themeImporter: {
							themePath: require.resolve( '@ckeditor/ckeditor5-theme-lark' )
						},
						minify: true
					} )
				}
			} ]
		} ]
	}
};

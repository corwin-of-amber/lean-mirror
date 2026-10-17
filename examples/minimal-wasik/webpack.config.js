import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';
import webpack from 'webpack';

const __dirname = path.dirname(fileURLToPath(import.meta.url)),
      require = createRequire(import.meta.url);


const opts = (argv) => ({
        mode: argv.mode || 'development',
        devtool: argv.mode !== 'production' ? "source-map" : undefined,
        stats: {
            hash: false, version: false, modules: false  // reduce verbosity
        },
    }),
    rules = [
        {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            options: {
                transpileOnly: true,
                appendTsSuffixTo: [/\.vue$/]
            }
        },
        {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
        },
        {
            test: /\.scss$/i,  /* Vue.js has some */
            use: ['style-loader', 'css-loader', 'sass-loader'],
        },
        {
            test: /\.(png|jpe?g|gif|svg)$/i,
            type: 'asset/resource',
            generator: {
                filename: 'img/[hash][ext][query]'
            }
        },
        {
            test: /\.vue$/,
            use: 'vue-loader'
        }
    ],
    plugins = [
        new webpack.ProvidePlugin({
            'Buffer': ['buffer', 'Buffer'],
            'process': 'process/browser'
        }),
        new webpack.NormalModuleReplacementPlugin(
            /^node:/,
            (resource) => {
                resource.request = resource.request.replace(/^node:/, '');
            }
        ),        
    ];



export default (env, argv) => [
{
    name: "app",
    entry: './src/main.ts',
    ...opts(argv),
    output: {
        filename: 'main.js',
        path: `${__dirname}/dist`
    },
    module: {rules},
    resolve: {
        conditionNames: ['browser', 'import', 'require'], 
        alias: {
            '@codemirror/state': require.resolve('@codemirror/state'),
            '@codemirror/view': require.resolve('@codemirror/view')
        },
        extensionAlias: {
            '.js': ['.ts', '.js'],
            '.jsx': ['.tsx', '.jsx']
        },
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            path: require.resolve("path-browserify"),
            //constants: require.resolve("constants-browserify"),
            buffer: require.resolve("buffer/"),
            process: require.resolve("process/browser"),
            module: false,
            constants: false
        }
    },
    plugins,
    externals: {
        fs: '{}'
    }
}];

import { $config, on } from 'signalizejs';

console.log($config)

on('asset-loader:success', document, (data) => {
	console.log(data);
})

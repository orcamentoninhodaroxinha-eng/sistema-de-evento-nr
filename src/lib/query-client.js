import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 60 * 1000,        // dados ficam frescos por 1 min
			gcTime: 5 * 60 * 1000,       // cache mantido por 5 min
		},
	},
});
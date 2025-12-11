import SearchModal from '@node-core/ui-components/Common/Search/Modal';
import SearchResults from '@node-core/ui-components/Common/Search/Results';
import SearchHit from '@node-core/ui-components/Common/Search/Results/Hit';

import useOrama from '../../hooks/useOrama.mjs';

const SearchBox = () => {
  const client = useOrama();

  return (
    <SearchModal client={client} placeholder={'Start typing...'}>
      <SearchResults
        noResultsTitle={'No results found for'}
        onHit={hit => <SearchHit document={hit.document} />}
      />
    </SearchModal>
  );
};

export default SearchBox;

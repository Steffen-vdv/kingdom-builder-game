import React from 'react';
import type {
	ResourceV2MetadataSnapshot,
	ResourceV2ValueSnapshot,
} from '../../translation';
import ResourceButton, { type ResourceButtonProps } from './ResourceButton';

export interface CoreResourceButtonProps {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
	onShow: (resourceId: string) => void;
	onHide: () => void;
}

const CoreResourceButtonComponent: React.FC<CoreResourceButtonProps> = ({
	metadata,
	snapshot,
	onShow,
	onHide,
}) => {
	const props: ResourceButtonProps = {
		metadata,
		snapshot,
		onShow,
		onHide,
	};
	return <ResourceButton {...props} />;
};

const CoreResourceButton = React.memo(CoreResourceButtonComponent);

export default CoreResourceButton;

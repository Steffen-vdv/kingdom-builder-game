import React from 'react';
import type {
	ResourceV2MetadataSnapshot,
	ResourceV2ValueSnapshot,
} from '../../translation';
import ResourceButton, { type ResourceButtonProps } from './ResourceButton';

export interface StatButtonProps {
	metadata: ResourceV2MetadataSnapshot;
	snapshot: ResourceV2ValueSnapshot;
	onShow: (resourceId: string) => void;
	onHide: () => void;
}

const StatButtonComponent: React.FC<StatButtonProps> = ({
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

const StatButton = React.memo(StatButtonComponent);

export default StatButton;

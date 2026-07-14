from pier.environments.docker.docker import DockerEnvironment  # pyright: ignore[reportMissingImports]


if not getattr(DockerEnvironment.__init__, "_preserves_default_mounts", False):
    original_init = DockerEnvironment.__init__

    def init_with_extra_mounts(self, *args, **kwargs):
        extra_mounts = kwargs.get("mounts_json")
        if extra_mounts is None or any(
            str(mount.get("target", "")).startswith("/logs/")
            for mount in extra_mounts
        ):
            return original_init(self, *args, **kwargs)

        kwargs["mounts_json"] = None
        original_init(self, *args, **kwargs)
        self._mounts_json.extend(extra_mounts)

    setattr(init_with_extra_mounts, "_preserves_default_mounts", True)
    DockerEnvironment.__init__ = init_with_extra_mounts

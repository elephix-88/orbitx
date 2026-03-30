from engine.utils.utils import chunked


def test_chunked_exact_split():
    assert list(chunked([1, 2, 3, 4], 2)) == [[1, 2], [3, 4]]


def test_chunked_with_remainder_final_flush():
    assert list(chunked([1, 2, 3, 4, 5], 2)) == [[1, 2], [3, 4], [5]]


def test_chunked_size_one():
    assert list(chunked([1, 2, 3], 1)) == [[1], [2], [3]]


def test_chunked_size_larger_than_len():
    assert list(chunked([1, 2], 10)) == [[1, 2]]


def test_chunked_with_range_iterable():
    assert list(chunked(range(5), 2)) == [[0, 1], [2, 3], [4]]


def test_chunked_with_generator_iterable():
    def gen():
        yield from range(5)

    assert list(chunked(gen(), 3)) == [[0, 1, 2], [3, 4]]


def test_chunked_preserves_order_and_new_lists():
    items = [1, 2, 3, 4]
    chunks = list(chunked(items, 2))

    assert chunks == [[1, 2], [3, 4]]
    assert chunks[0] is not chunks[1]
